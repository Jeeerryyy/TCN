import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
    const mockSecret = Deno.env.get('MOCK_GATEWAY_SECRET') || 'mock-secret-key-12345';

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { paymentId, provider, payload } = body;

    if (!paymentId || !provider || !payload) {
      return new Response(JSON.stringify({ error: 'Missing required verification fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let isValid = false;
    let providerPaymentId = payload.payment_id || payload.razorpay_payment_id || `pay_${crypto.randomUUID().slice(0, 8)}`;
    let method = payload.method || 'online';

    if (provider === 'razorpay') {
      const orderId = payload.razorpay_order_id;
      const paymentIdRzp = payload.razorpay_payment_id;
      const signature = payload.razorpay_signature;

      if (!orderId || !paymentIdRzp || !signature) {
        throw new Error('Incomplete Razorpay payment response payload');
      }
      const dataToSign = `${orderId}|${paymentIdRzp}`;
      isValid = await verifyHmacSha256(dataToSign, razorpayKeySecret, signature);
      providerPaymentId = paymentIdRzp;
    } else if (provider === 'mock_gateway') {
      const signature = payload.signature;
      const dataToSign = `${payload.order_id}|${payload.payment_id}`;
      if (signature) {
        isValid = await verifyHmacSha256(dataToSign, mockSecret, signature);
      } else {
        isValid = payload.status === 'success';
      }
    } else {
      // manual_upi
      isValid = true;
      method = 'upi';
      providerPaymentId = payload.utr || providerPaymentId;
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Payment signature verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call rpc_verify_and_capture_payment
    const { data: capturedPayment, error: captureError } = await adminClient.rpc('rpc_verify_and_capture_payment', {
      p_payment_id: paymentId,
      p_provider_payment_id: providerPaymentId,
      p_method: method,
      p_raw: payload,
    });

    if (captureError) throw captureError;

    return new Response(
      JSON.stringify({
        success: true,
        payment: capturedPayment,
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
