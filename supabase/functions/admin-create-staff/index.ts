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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // Verify requesting caller has Admin JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role in profiles
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, username, name, pin, userId, active } = body;

    if (action === 'create') {
      if (!username || !pin || pin.length < 6) {
        return new Response(JSON.stringify({ error: 'Username and 6-digit PIN are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const email = `${username.toLowerCase().trim()}@tcn.local`;
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: pin,
        email_confirm: true,
        user_metadata: { name: name || username, username, role: 'staff' },
      });

      if (createError) throw createError;

      // Seed profile
      const { data: branch } = await adminClient.from('branches').select('id').limit(1).single();
      const branchId = branch?.id || '00000000-0000-0000-0000-000000000001';

      const { data: profile, error: profError } = await adminClient
        .from('profiles')
        .insert({
          id: newUser.user.id,
          branch_id: branchId,
          role: 'staff',
          name: name || username,
          username: username.toLowerCase().trim(),
          email,
          active: true,
        })
        .select()
        .single();

      if (profError) throw profError;

      return new Response(JSON.stringify({ success: true, profile }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_pin') {
      if (!userId || !pin || pin.length < 6) {
        return new Response(JSON.stringify({ error: 'userId and 6-digit PIN required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(userId, {
        password: pin,
      });

      if (resetError) throw resetError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'toggle_active') {
      if (!userId || active === undefined) {
        return new Response(JSON.stringify({ error: 'userId and active boolean required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ active })
        .eq('id', userId);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ success: true, active }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message || 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
