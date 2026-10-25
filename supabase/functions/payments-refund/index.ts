import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') || '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { paymentId, amountPaise, reason, requestedBy } = body;

    if (!paymentId || !amountPaise || !reason) {
      return new Response(JSON.stringify({ error: 'Missing required refund fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch payment details
    const { data: payment, error: pError } = await adminClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (pError || !payment) {
      throw new Error('Payment not found');
    }

    let providerRefundId = `ref_${crypto.randomUUID().slice(0, 12)}`;

    // 2. Process with gateway if razorpay
    if (payment.provider === 'razorpay') {
      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay keys not configured on server');
      }
      if (!payment.provider_payment_id) {
        throw new Error('No provider payment ID found to refund');
      }

      const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${payment.provider_payment_id}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          notes: { reason },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        throw new Error(rzpData.error?.description || 'Razorpay refund failed');
      }
      providerRefundId = rzpData.id;
    } else if (payment.provider === 'mock_gateway') {
      providerRefundId = `mock_ref_${crypto.randomUUID().slice(0, 10)}`;
    } else {
      // manual_upi
      providerRefundId = `upi_ref_${crypto.randomUUID().slice(0, 10)}`;
    }

    // 3. Record refund in database
    const { data: refundRow, error: rpcError } = await adminClient.rpc('rpc_process_refund', {
      p_payment_id: paymentId,
      p_amount_paise: amountPaise,
      p_reason: reason,
      p_provider_refund_id: providerRefundId,
      p_requested_by: requestedBy || null,
    });

    if (rpcError) throw rpcError;

    return new Response(
      JSON.stringify({
        success: true,
        refund: refundRow,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message || 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
