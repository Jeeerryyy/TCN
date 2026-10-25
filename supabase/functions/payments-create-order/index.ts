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
    const { purpose, refId, amountPaise, idempotencyKey, customerId, customerName, customerEmail, customerPhone } = body;

    if (!purpose || !refId || !amountPaise || !idempotencyKey) {
      return new Response(JSON.stringify({ error: 'Missing required payment order fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch active provider from settings
    const { data: settingsData } = await adminClient
      .from('settings')
      .select('value')
      .eq('key', 'payments.provider')
      .single();

    const activeProvider = settingsData?.value || 'manual_upi';

    let providerOrderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    let clientPayload: Record<string, unknown> = {};

    // 2. Delegate based on active provider
    if (activeProvider === 'razorpay') {
      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay keys not configured on server');
      }
      const authHeader = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: idempotencyKey.slice(0, 40),
          notes: { purpose, ref_id: refId },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        throw new Error(rzpData.error?.description || 'Razorpay order creation failed');
      }
      providerOrderId = rzpData.id;
      clientPayload = {
        key: razorpayKeyId,
        order_id: rzpData.id,
        amount: amountPaise,
        currency: 'INR',
        name: 'The Cue Nation',
        description: `${purpose.toUpperCase()} Deposit / Payment`,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
      };
    } else if (activeProvider === 'mock_gateway') {
      providerOrderId = `mock_ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      clientPayload = {
        provider: 'mock_gateway',
        order_id: providerOrderId,
        amount: amountPaise,
        currency: 'INR',
        checkoutUrl: `/payments/mock-checkout?order_id=${providerOrderId}&amount=${amountPaise}&purpose=${purpose}&ref_id=${refId}`,
      };
    } else {
      // manual_upi
      providerOrderId = `upi_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      clientPayload = {
        provider: 'manual_upi',
        order_id: providerOrderId,
        amount: amountPaise,
        currency: 'INR',
        upi_id: Deno.env.get('VITE_PUBLIC_UPI_ID') || 'thecuenation@okaxis',
        payee_name: Deno.env.get('VITE_PUBLIC_PAYEE_NAME') || 'The Cue Nation',
      };
    }

    // 3. Insert or fetch existing payment record
    const { data: paymentRow, error: rpcError } = await adminClient.rpc('rpc_create_payment_order', {
      p_purpose: purpose,
      p_ref_id: refId,
      p_amount_paise: amountPaise,
      p_provider: activeProvider,
      p_provider_order_id: providerOrderId,
      p_idempotency_key: idempotencyKey,
      p_customer_id: customerId || null,
    });

    if (rpcError) throw rpcError;

    return new Response(
      JSON.stringify({
        success: true,
        payment: paymentRow,
        provider: activeProvider,
        providerOrderId,
        clientPayload,
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
