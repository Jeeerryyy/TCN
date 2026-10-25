-- ============================================================================
-- pgTAP Test Suite: rls_and_billing.sql
-- Covers:
-- 1. Billing algorithm test matrix (TRD Section 10)
-- 2. RLS Security boundary enforcement (TRD Section 7 & 14)
-- 3. Idempotency with duplicate op_id
-- ============================================================================

BEGIN;

-- Plan test cases
SELECT plan(18);

-- ----------------------------------------------------------------------------
-- Test 1: Extensions check
-- ----------------------------------------------------------------------------
SELECT has_extension('pgcrypto', 'pgcrypto extension installed');
SELECT has_extension('btree_gist', 'btree_gist extension installed');

-- ----------------------------------------------------------------------------
-- Test 2: RLS Enabled on critical tables
-- ----------------------------------------------------------------------------
SELECT table_privs_are(
  'public', 'expenses', 'authenticated', ARRAY[]::text[],
  'Staff role has no direct privileges on expenses'
);

-- Check RLS is active on tables
SELECT row_security_active('expenses');
SELECT row_security_active('audit_log');
SELECT row_security_active('settings');

-- ----------------------------------------------------------------------------
-- Test 3: Billing algorithm cases (TRD Section 10)
-- ----------------------------------------------------------------------------

-- Setup test branch, tables, rate rules
DO $$
DECLARE
  v_branch_id uuid := '00000000-0000-0000-0000-000000000001';
  v_table_id uuid := '10000000-0000-0000-0000-000000000001';
  v_session_id uuid := gen_random_uuid();
  v_result jsonb;
  v_charge integer;
BEGIN
  -- Insert a mock session of 20 active minutes (Started at 10:00, stopped at 10:20)
  INSERT INTO sessions (id, branch_id, table_id, status, started_at, ended_at, op_id)
  VALUES (v_session_id, v_branch_id, v_table_id, 'completed', '2026-10-24 10:00:00+05:30', '2026-10-24 10:20:00+05:30', gen_random_uuid());

  INSERT INTO session_segments (id, session_id, table_id, started_at, ended_at)
  VALUES (gen_random_uuid(), v_session_id, v_table_id, '2026-10-24 10:00:00+05:30', '2026-10-24 10:20:00+05:30');

  -- Case 1: 20 min session -> minimum 60 min charged (at 200/hr = 20000 paise)
  v_result := fn_compute_table_charge(v_session_id, '2026-10-24 10:20:00+05:30'::timestamptz);
  v_charge := (v_result->>'amount')::integer;
  
  IF v_charge = 20000 THEN
    PERFORM pass('Case 1: 20 min session charged 60 min minimum (20000 paise)');
  ELSE
    PERFORM fail('Case 1: 20 min session charged ' || v_charge || ' instead of 20000 paise');
  END IF;
END $$;

-- Case 2: exactly 60 min session -> 60 min charged
DO $$
DECLARE
  v_branch_id uuid := '00000000-0000-0000-0000-000000000001';
  v_table_id uuid := '10000000-0000-0000-0000-000000000001';
  v_session_id uuid := gen_random_uuid();
  v_result jsonb;
  v_charge integer;
BEGIN
  INSERT INTO sessions (id, branch_id, table_id, status, started_at, ended_at, op_id)
  VALUES (v_session_id, v_branch_id, v_table_id, 'completed', '2026-10-24 10:00:00+05:30', '2026-10-24 11:00:00+05:30', gen_random_uuid());

  INSERT INTO session_segments (id, session_id, table_id, started_at, ended_at)
  VALUES (gen_random_uuid(), v_session_id, v_table_id, '2026-10-24 10:00:00+05:30', '2026-10-24 11:00:00+05:30');

  v_result := fn_compute_table_charge(v_session_id, '2026-10-24 11:00:00+05:30'::timestamptz);
  v_charge := (v_result->>'amount')::integer;
  
  IF v_charge = 20000 THEN
    PERFORM pass('Case 2: Exactly 60 min session charged 20000 paise');
  ELSE
    PERFORM fail('Case 2: 60 min session charged ' || v_charge);
  END IF;
END $$;

-- Case 3: 67 min session -> rounded up to 75 min (1 hr + 15 min block = 25000 paise)
DO $$
DECLARE
  v_branch_id uuid := '00000000-0000-0000-0000-000000000001';
  v_table_id uuid := '10000000-0000-0000-0000-000000000001';
  v_session_id uuid := gen_random_uuid();
  v_result jsonb;
  v_charge integer;
BEGIN
  INSERT INTO sessions (id, branch_id, table_id, status, started_at, ended_at, op_id)
  VALUES (v_session_id, v_branch_id, v_table_id, 'completed', '2026-10-24 10:00:00+05:30', '2026-10-24 11:07:00+05:30', gen_random_uuid());

  INSERT INTO session_segments (id, session_id, table_id, started_at, ended_at)
  VALUES (gen_random_uuid(), v_session_id, v_table_id, '2026-10-24 10:00:00+05:30', '2026-10-24 11:07:00+05:30');

  v_result := fn_compute_table_charge(v_session_id, '2026-10-24 11:07:00+05:30'::timestamptz);
  v_charge := (v_result->>'amount')::integer;
  
  IF v_charge = 25000 THEN
    PERFORM pass('Case 3: 67 min session charged 75 min (25000 paise)');
  ELSE
    PERFORM fail('Case 3: 67 min session charged ' || v_charge);
  END IF;
END $$;

-- Case 4: 70 min elapsed with 10 min pause -> 60 min active charged (20000 paise)
DO $$
DECLARE
  v_branch_id uuid := '00000000-0000-0000-0000-000000000001';
  v_table_id uuid := '10000000-0000-0000-0000-000000000001';
  v_session_id uuid := gen_random_uuid();
  v_result jsonb;
  v_charge integer;
BEGIN
  INSERT INTO sessions (id, branch_id, table_id, status, started_at, ended_at, op_id)
  VALUES (v_session_id, v_branch_id, v_table_id, 'completed', '2026-10-24 10:00:00+05:30', '2026-10-24 11:10:00+05:30', gen_random_uuid());

  INSERT INTO session_segments (id, session_id, table_id, started_at, ended_at)
  VALUES (gen_random_uuid(), v_session_id, v_table_id, '2026-10-24 10:00:00+05:30', '2026-10-24 11:10:00+05:30');

  -- 10 minute pause
  INSERT INTO session_pauses (id, session_id, paused_at, resumed_at)
  VALUES (gen_random_uuid(), v_session_id, '2026-10-24 10:20:00+05:30', '2026-10-24 10:30:00+05:30');

  v_result := fn_compute_table_charge(v_session_id, '2026-10-24 11:10:00+05:30'::timestamptz);
  v_charge := (v_result->>'amount')::integer;
  
  IF v_charge = 20000 THEN
    PERFORM pass('Case 4: 70 min elapsed with 10 min pause charged 60 min active (20000 paise)');
  ELSE
    PERFORM fail('Case 4: Paused session charged ' || v_charge);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Test 4: Member vs Walk-in rate resolution
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_rate_walkin integer;
  v_rate_member integer;
BEGIN
  v_rate_walkin := fn_resolve_rate('pool', '2026-10-24 14:00:00+05:30'::timestamptz, 'walk_in');
  v_rate_member := fn_resolve_rate('pool', '2026-10-24 14:00:00+05:30'::timestamptz, 'member');

  PERFORM ok(v_rate_walkin > 0, 'Walk-in rate resolves to positive value');
  PERFORM ok(v_rate_member <= v_rate_walkin, 'Member rate is less than or equal to walk-in');
END $$;

-- ----------------------------------------------------------------------------
-- Test 5: Weekend / Saturday rule resolution
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_saturday_rate integer;
BEGIN
  -- 2026-10-24 is Saturday
  v_saturday_rate := fn_resolve_rate('pool', '2026-10-24 20:00:00+05:30'::timestamptz, 'walk_in');
  PERFORM ok(v_saturday_rate > 0, 'Saturday evening rate resolves successfully');
END $$;

-- ----------------------------------------------------------------------------
-- Test 6: Wrap-past-midnight band resolution
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_midnight_rate integer;
BEGIN
  -- 00:30 AM
  v_midnight_rate := fn_resolve_rate('pool', '2026-10-24 00:30:00+05:30'::timestamptz, 'walk_in');
  PERFORM ok(v_midnight_rate > 0, 'Past-midnight rate band resolves correctly');
END $$;

-- ----------------------------------------------------------------------------
-- Test 7: Idempotency with duplicate op_id
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_op_id uuid := gen_random_uuid();
  v_res1 jsonb;
  v_res2 jsonb;
  v_sess1_id text;
  v_sess2_id text;
  v_table_id uuid := '10000000-0000-0000-0000-000000000002';
BEGIN
  -- First call with op_id
  v_res1 := rpc_start_session(v_op_id, v_table_id, NULL, 2, NULL);
  v_sess1_id := v_res1->'session'->>'id';

  -- Duplicate call with the same op_id
  v_res2 := rpc_start_session(v_op_id, v_table_id, NULL, 2, NULL);
  v_sess2_id := v_res2->'session'->>'id';

  IF v_sess1_id = v_sess2_id THEN
    PERFORM pass('Idempotency: duplicate op_id returns existing session without duplication');
  ELSE
    PERFORM fail('Idempotency failed: session IDs mismatch');
  END IF;

  -- Ensure only 1 active session was created on table 2
  IF (SELECT count(*) FROM sessions WHERE table_id = v_table_id AND status = 'running') = 1 THEN
    PERFORM pass('Idempotency: exactly 1 session exists in database');
  ELSE
    PERFORM fail('Idempotency: more than 1 session found');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Test 8: State Machine Guard
-- Cannot start a session on a table that is already running
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_table_id uuid := '10000000-0000-0000-0000-000000000002';
  v_failed boolean := false;
BEGIN
  BEGIN
    PERFORM rpc_start_session(gen_random_uuid(), v_table_id, NULL, 2, NULL);
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;

  IF v_failed THEN
    PERFORM pass('State machine guard: cannot start session on occupied table');
  ELSE
    PERFORM fail('State machine guard failed: allowed session on occupied table');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Test 9: Complete and finish
-- ----------------------------------------------------------------------------
SELECT * FROM finish();
ROLLBACK;
