import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory sliding window rate limiter: 5 requests per hour per IP / phone
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= 5) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown-ip';
    const body = await req.json();
    const { name, phone, tableType, startTime, endTime, turnstileToken } = body;

    if (!name || !phone || !tableType || !startTime || !endTime) {
      return new Response(JSON.stringify({ error: 'Missing required booking fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Rate limiting check (per IP and per Phone)
    if (!checkRateLimit(`ip:${clientIp}`) || !checkRateLimit(`phone:${phone}`)) {
      return new Response(
        JSON.stringify({ error: 'Too many booking requests. Please try again in an hour.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cloudflare Turnstile verification (if configured)
    if (turnstileSecret && turnstileToken) {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: clientIp,
        }),
      });
      const turnstileData = await turnstileRes.json();
      if (!turnstileData.success) {
        return new Response(JSON.stringify({ error: 'Captcha verification failed' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Call rpc_create_booking
    const { data, error } = await adminClient.rpc('rpc_create_booking', {
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_source: 'online',
      p_table_type: tableType,
      p_start_time: startTime,
      p_end_time: endTime,
      p_created_by: null,
    });

    if (error) throw error;

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    return new Response(
      JSON.stringify({
        success: true,
        booking: parsed.booking,
        depositAmount: parsed.deposit_amount || 10000,
        upiId: 'thecuenation@okaxis',
        payeeName: 'The Cue Nation',
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
