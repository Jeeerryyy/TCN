import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-mock-signature',
};

async function verifyHmacSha256(data: string, secret: string, expectedHexSignature: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBytes = new Uint8Array(
    expectedHexSignature.match(/[\da-f]{2}/gi)?.map((h) => parseInt(h, 16)) || []
  );
  return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const razorpayWebhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
    const mockSecret = Deno.env.get('MOCK_GATEWAY_SECRET') || 'mock-secret-key-12345';

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Read the exact raw body string for cryptographic signature validation
    const rawBody = await req.text();
    const rzpSignature = req.headers.get('x-razorpay-signature');
    const mockSignature = req.headers.get('x-mock-signature');

    let provider = 'manual_upi';
    let isValid = false;

    if (rzpSignature) {
      provider = 'razorpay';
      if (!razorpayWebhookSecret) {
        throw new Error('Razorpay webhook secret not configured');
      }
      isValid = await verifyHmacSha256(rawBody, razorpayWebhookSecret, rzpSignature);
    } else if (mockSignature) {
      provider = 'mock_gateway';
      isValid = await verifyHmacSha256(rawBody, mockSecret, mockSignature);
    } else {
      // Local testing / manual simulation without signature
      provider = 'mock_gateway';
      isValid = true;
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event || payload.type || 'payment.captured';
    const eventId = payload.id || payload.event_id || `evt_${crypto.randomUUID().slice(0, 16)}`;

    // 1. Idempotently record event first
    const { data: recordedEvent, error: recordError } = await adminClient.rpc('rpc_record_payment_event', {
      p_provider: provider,
      p_provider_event_id: eventId,
      p_type: eventType,
      p_payload: payload,
    });

    if (recordError) throw recordError;

    // If event was already processed previously, return 200 immediately
    if (recordedEvent && recordedEvent.processed_at) {
      return new Response(JSON.stringify({ status: 'already_processed', event_id: eventId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Dispatch event
    let targetPaymentId: string | null = null;
    let providerOrderId: string | null = null;
    let providerPaymentId: string | null = null;

    if (provider === 'razorpay') {
      const paymentEntity = payload.payload?.payment?.entity;
      providerOrderId = paymentEntity?.order_id;
      providerPaymentId = paymentEntity?.id;
    } else {
      providerOrderId = payload.order_id;
      providerPaymentId = payload.payment_id;
    }

    if (providerOrderId) {
      const { data: pRow } = await adminClient
        .from('payments')
        .select('id, status')
        .eq('provider_order_id', providerOrderId)
        .single();

      if (pRow) {
        targetPaymentId = pRow.id;
      }
    }

    if (targetPaymentId) {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        await adminClient.rpc('rpc_verify_and_capture_payment', {
          p_payment_id: targetPaymentId,
          p_provider_payment_id: providerPaymentId || 'pay_unknown',
          p_method: 'online',
          p_raw: payload,
        });
      } else if (eventType === 'refund.processed') {
        const refundAmount = payload.payload?.refund?.entity?.amount || payload.amount || 0;
        await adminClient.rpc('rpc_process_refund', {
          p_payment_id: targetPaymentId,
          p_amount_paise: refundAmount,
          p_reason: 'Webhook refund notification',
          p_provider_refund_id: payload.refund_id || 'ref_webhook',
        });
      }

      // Mark event as processed
      await adminClient
        .from('payment_events')
        .update({ processed_at: new Date().toISOString(), payment_id: targetPaymentId })
        .eq('provider_event_id', eventId);
    }

    return new Response(JSON.stringify({ status: 'success', event_id: eventId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message || 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
