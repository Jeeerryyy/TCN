-- 0015_auth_events_audit.sql
-- Auth Activity Audit: auth_events table, rpc_log_auth_event, suspicious auth alert detection

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE auth_event_type AS ENUM (
    'login',
    'logout',
    'login_failed',
    'register',
    'password_reset_requested',
    'password_changed',
    'google_login',
    'session_expired',
    'link_requested'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auth_method_type AS ENUM ('email', 'google', 'staff_pin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'auth_suspicious';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create auth_events table
CREATE TABLE IF NOT EXISTS auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role user_role,
  identifier_masked TEXT NOT NULL,
  event auth_event_type NOT NULL,
  method auth_method_type NOT NULL,
  ip TEXT,
  user_agent TEXT,
  device_label TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_created ON auth_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_user ON auth_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_identifier ON auth_events(identifier_masked);
CREATE INDEX IF NOT EXISTS idx_auth_events_event ON auth_events(event);

-- 3. Masking Helper Function
CREATE OR REPLACE FUNCTION fn_mask_identifier(p_val TEXT)
RETURNS TEXT AS $$
DECLARE
  v_parts TEXT[];
  v_name TEXT;
  v_domain TEXT;
BEGIN
  IF p_val IS NULL OR length(p_val) = 0 THEN
    RETURN 'anonymous';
  END IF;

  -- Email masking
  IF position('@' IN p_val) > 0 THEN
    v_parts := string_to_array(p_val, '@');
    v_name := v_parts[1];
    v_domain := v_parts[2];
    IF length(v_name) <= 2 THEN
      RETURN substr(v_name, 1, 1) || '***@' || v_domain;
    ELSE
      RETURN substr(v_name, 1, 1) || '***' || substr(v_name, length(v_name), 1) || '@' || v_domain;
    END IF;
  END IF;

  -- Username masking
  IF length(p_val) <= 2 THEN
    RETURN substr(p_val, 1, 1) || '***';
  ELSE
    RETURN substr(p_val, 1, 2) || '***' || substr(p_val, length(p_val), 1);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. rpc_log_auth_event
CREATE OR REPLACE FUNCTION rpc_log_auth_event(
  p_event auth_event_type,
  p_method auth_method_type,
  p_identifier TEXT,
  p_success BOOLEAN DEFAULT true,
  p_user_id UUID DEFAULT NULL,
  p_device_label TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_masked TEXT;
  v_role user_role;
  v_branch_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ip TEXT;
  v_ua TEXT;
  v_headers JSONB;
  v_event_id UUID;
  v_recent_failures INT := 0;
  v_target_user_id UUID := p_user_id;
  v_rate_limit_count INT := 0;
BEGIN
  -- 1. Input sanitization & caps
  IF length(p_identifier) > 100 THEN
    p_identifier := substr(p_identifier, 1, 100);
  END IF;

  IF pg_column_size(p_meta) > 2048 THEN
    p_meta := '{"truncated": true}'::jsonb;
  END IF;

  -- 2. Extract client IP and User-Agent from Supabase request headers if present
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
    v_ip := COALESCE(
      v_headers->>'x-forwarded-for',
      v_headers->>'x-real-ip',
      p_meta->>'ip',
      'unknown'
    );
    -- If multiple comma-separated IPs in x-forwarded-for, take the first client IP
    IF position(',' IN v_ip) > 0 THEN
      v_ip := trim(split_part(v_ip, ',', 1));
    END IF;
    v_ua := COALESCE(v_headers->>'user-agent', p_meta->>'user_agent', 'unknown');
  EXCEPTION WHEN OTHERS THEN
    v_ip := COALESCE(p_meta->>'ip', 'unknown');
    v_ua := COALESCE(p_meta->>'user_agent', 'unknown');
  END;

  -- 3. Rate limit check for unauthenticated failed attempts (max 20 per minute per IP)
  IF NOT p_success AND v_ip <> 'unknown' THEN
    SELECT count(*) INTO v_rate_limit_count
    FROM auth_events
    WHERE ip = v_ip AND created_at > now() - INTERVAL '1 minute';

    IF v_rate_limit_count >= 20 THEN
      -- Rate limited: ignore silently to prevent spam/DOS
      RETURN NULL;
    END IF;
  END IF;

  -- 4. Resolve user_id and role
  IF v_target_user_id IS NULL AND auth.uid() IS NOT NULL THEN
    v_target_user_id := auth.uid();
  END IF;

  IF v_target_user_id IS NOT NULL THEN
    SELECT role INTO v_role FROM profiles WHERE id = v_target_user_id;
  END IF;

  -- Mask identifier
  v_masked := fn_mask_identifier(p_identifier);

  -- 5. Insert event
  INSERT INTO auth_events (
    branch_id,
    user_id,
    role,
    identifier_masked,
    event,
    method,
    ip,
    user_agent,
    device_label,
    success,
    meta
  ) VALUES (
    v_branch_id,
    v_target_user_id,
    v_role,
    v_masked,
    p_event,
    p_method,
    v_ip,
    v_ua,
    p_device_label,
    p_success,
    p_meta
  )
  RETURNING id INTO v_event_id;

  -- 6. Brute force / suspicious login alert rule:
  -- >= 5 failed logins for same identifier or IP within 10 minutes
  IF NOT p_success AND p_event = 'login_failed' THEN
    SELECT count(*) INTO v_recent_failures
    FROM auth_events
    WHERE event = 'login_failed'
      AND created_at > now() - INTERVAL '10 minutes'
      AND (identifier_masked = v_masked OR (ip = v_ip AND v_ip <> 'unknown'));

    IF v_recent_failures >= 5 THEN
      -- Create alert for admin
      INSERT INTO alerts (branch_id, type, message, ref_id)
      VALUES (
        v_branch_id,
        'auth_suspicious',
        'Suspicious auth activity: ' || v_recent_failures || ' failed login attempts for ' || v_masked || ' from IP ' || v_ip,
        v_event_id
      );
    END IF;
  END IF;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION rpc_log_auth_event TO anon, authenticated;

-- 5. Retention Pruning Function (180 days)
CREATE OR REPLACE FUNCTION fn_prune_auth_events()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM auth_events
  WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
