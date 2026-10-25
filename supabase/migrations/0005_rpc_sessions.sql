-- 0005_rpc_sessions.sql
-- TCN Technical Requirements Document (TRD) Section 8 and Section 13.5
-- Core session management, table transitions, customer picker, and maintenance RPCs.

CREATE OR REPLACE FUNCTION rpc_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;

-- 1. rpc_upsert_customer
CREATE OR REPLACE FUNCTION rpc_upsert_customer(
  p_phone text,
  p_name text,
  p_notes text DEFAULT NULL
)
RETURNS customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_customer customers;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: User not active' USING ERRCODE = 'P0001';
  END IF;

  v_branch_id := fn_branch_id();
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM branches LIMIT 1;
  END IF;

  INSERT INTO customers (branch_id, phone, name, notes, created_by)
  VALUES (v_branch_id, TRIM(p_phone), TRIM(p_name), p_notes, auth.uid())
  ON CONFLICT (branch_id, phone)
  DO UPDATE SET
    name = EXCLUDED.name,
    notes = COALESCE(EXCLUDED.notes, customers.notes)
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;

-- 2. rpc_start_session
CREATE OR REPLACE FUNCTION rpc_start_session(
  p_op_id uuid,
  p_table_id uuid,
  p_customer_id uuid DEFAULT NULL,
  p_players int DEFAULT 1,
  p_booking_id uuid DEFAULT NULL
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_table game_tables;
  v_session sessions;
  v_existing_op op_log;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Inactive user' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency check via op_log
  IF p_op_id IS NOT NULL THEN
    SELECT * INTO v_existing_op FROM op_log WHERE op_id = p_op_id;
    IF FOUND THEN
      SELECT * INTO v_session FROM sessions WHERE id = (v_existing_op.result->>'id')::uuid;
      RETURN v_session;
    END IF;
  END IF;

  -- Lock table row for update
  SELECT * INTO v_table FROM game_tables WHERE id = p_table_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Table not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_table.status <> 'free' THEN
    RAISE EXCEPTION 'E_TABLE_BUSY: Table % is not free (status: %)', v_table.name, v_table.status
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_table.active THEN
    RAISE EXCEPTION 'E_BAD_STATE: Table % is inactive', v_table.name USING ERRCODE = 'P0001';
  END IF;

  v_branch_id := v_table.branch_id;

  -- Insert session
  INSERT INTO sessions (
    branch_id,
    table_id,
    customer_id,
    booking_id,
    players,
    status,
    started_at,
    created_by,
    op_id
  )
  VALUES (
    v_branch_id,
    p_table_id,
    p_customer_id,
    p_booking_id,
    GREATEST(1, LEAST(COALESCE(p_players, 1), 12)),
    'running',
    now(),
    auth.uid(),
    p_op_id
  )
  RETURNING * INTO v_session;

  -- Insert first session segment
  INSERT INTO session_segments (session_id, table_id, started_at)
  VALUES (v_session.id, p_table_id, now());

  -- Create initial empty order for this session
  INSERT INTO orders (branch_id, session_id, customer_id, created_by, status)
  VALUES (v_branch_id, v_session.id, p_customer_id, auth.uid(), 'open');

  -- Update table status to running
  UPDATE game_tables SET status = 'running' WHERE id = p_table_id;

  -- If started from a booking, update booking status to checked_in
  IF p_booking_id IS NOT NULL THEN
    UPDATE bookings
    SET status = 'checked_in'
    WHERE id = p_booking_id;
  END IF;

  -- Record idempotency
  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, user_id, rpc, result)
    VALUES (p_op_id, auth.uid(), 'rpc_start_session', to_jsonb(v_session))
    ON CONFLICT (op_id) DO NOTHING;
  END IF;

  RETURN v_session;
END;
$$;

-- 3. rpc_pause_session
CREATE OR REPLACE FUNCTION rpc_pause_session(
  p_op_id uuid,
  p_session_id uuid
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions;
  v_existing_op op_log;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Inactive user' USING ERRCODE = 'P0001';
  END IF;

  IF p_op_id IS NOT NULL THEN
    SELECT * INTO v_existing_op FROM op_log WHERE op_id = p_op_id;
    IF FOUND THEN
      SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
      RETURN v_session;
    END IF;
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Session not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.status <> 'running' THEN
    RAISE EXCEPTION 'E_BAD_STATE: Session is not running (status: %)', v_session.status
      USING ERRCODE = 'P0001';
  END IF;

  -- Insert pause
  INSERT INTO session_pauses (session_id, paused_at)
  VALUES (p_session_id, now());

  -- Update session and table statuses
  UPDATE sessions SET status = 'paused' WHERE id = p_session_id RETURNING * INTO v_session;
  UPDATE game_tables SET status = 'paused' WHERE id = v_session.table_id;

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, user_id, rpc, result)
    VALUES (p_op_id, auth.uid(), 'rpc_pause_session', to_jsonb(v_session))
    ON CONFLICT (op_id) DO NOTHING;
  END IF;

  RETURN v_session;
END;
$$;

-- 4. rpc_resume_session
CREATE OR REPLACE FUNCTION rpc_resume_session(
  p_op_id uuid,
  p_session_id uuid
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions;
  v_existing_op op_log;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Inactive user' USING ERRCODE = 'P0001';
  END IF;

  IF p_op_id IS NOT NULL THEN
    SELECT * INTO v_existing_op FROM op_log WHERE op_id = p_op_id;
    IF FOUND THEN
      SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
      RETURN v_session;
    END IF;
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Session not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.status <> 'paused' THEN
    RAISE EXCEPTION 'E_BAD_STATE: Session is not paused (status: %)', v_session.status
      USING ERRCODE = 'P0001';
  END IF;

  -- Close open pause
  UPDATE session_pauses
  SET resumed_at = now()
  WHERE session_id = p_session_id AND resumed_at IS NULL;

  -- Update session and table statuses
  UPDATE sessions SET status = 'running' WHERE id = p_session_id RETURNING * INTO v_session;
  UPDATE game_tables SET status = 'running' WHERE id = v_session.table_id;

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, user_id, rpc, result)
    VALUES (p_op_id, auth.uid(), 'rpc_resume_session', to_jsonb(v_session))
    ON CONFLICT (op_id) DO NOTHING;
  END IF;

  RETURN v_session;
END;
$$;

-- 5. rpc_transfer_session
CREATE OR REPLACE FUNCTION rpc_transfer_session(
  p_op_id uuid,
  p_session_id uuid,
  p_to_table_id uuid
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions;
  v_dest_table game_tables;
  v_existing_op op_log;
  v_old_table_id uuid;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Inactive user' USING ERRCODE = 'P0001';
  END IF;

  IF p_op_id IS NOT NULL THEN
    SELECT * INTO v_existing_op FROM op_log WHERE op_id = p_op_id;
    IF FOUND THEN
      SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
      RETURN v_session;
    END IF;
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Session not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'E_BAD_STATE: Cannot transfer completed session' USING ERRCODE = 'P0001';
  END IF;

  -- Lock destination table
  SELECT * INTO v_dest_table FROM game_tables WHERE id = p_to_table_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Destination table not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_dest_table.status <> 'free' THEN
    RAISE EXCEPTION 'E_TABLE_BUSY: Destination table % is not free', v_dest_table.name
      USING ERRCODE = 'P0001';
  END IF;

  v_old_table_id := v_session.table_id;

  -- Close current segment
  UPDATE session_segments
  SET ended_at = now()
  WHERE session_id = p_session_id AND ended_at IS NULL;

  -- Open new segment on destination table
  INSERT INTO session_segments (session_id, table_id, started_at)
  VALUES (p_session_id, p_to_table_id, now());

  -- Update table statuses
  UPDATE game_tables SET status = 'free' WHERE id = v_old_table_id;
  UPDATE game_tables SET status = v_session.status WHERE id = p_to_table_id;

  -- Update session table pointer
  UPDATE sessions
  SET table_id = p_to_table_id
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, user_id, rpc, result)
    VALUES (p_op_id, auth.uid(), 'rpc_transfer_session', to_jsonb(v_session))
    ON CONFLICT (op_id) DO NOTHING;
  END IF;

  RETURN v_session;
END;
$$;

-- 6. rpc_set_players
CREATE OR REPLACE FUNCTION rpc_set_players(
  p_op_id uuid,
  p_session_id uuid,
  p_players int
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Inactive user' USING ERRCODE = 'P0001';
  END IF;

  IF p_players < 1 OR p_players > 12 THEN
    RAISE EXCEPTION 'E_VALIDATION: Players count must be between 1 and 12' USING ERRCODE = 'P0001';
  END IF;

  UPDATE sessions
  SET players = p_players
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Session not found' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_session;
END;
$$;

-- 7. rpc_stop_session
CREATE OR REPLACE FUNCTION rpc_stop_session(
  p_op_id uuid,
  p_session_id uuid
)
RETURNS bills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session sessions;
  v_bill bills;
  v_existing_op op_log;
  v_table_charge numeric;
  v_breakdown jsonb;
  v_cafe_total numeric := 0;
  v_deposit_applied numeric := 0;
  v_order_id uuid;
  v_total numeric;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Inactive user' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotency check
  IF p_op_id IS NOT NULL THEN
    SELECT * INTO v_existing_op FROM op_log WHERE op_id = p_op_id;
    IF FOUND THEN
      SELECT * INTO v_bill FROM bills WHERE id = (v_existing_op.result->>'id')::uuid;
      RETURN v_bill;
    END IF;
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Session not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_session.status = 'completed' THEN
    -- If already completed, return existing bill
    SELECT * INTO v_bill FROM bills WHERE session_id = p_session_id LIMIT 1;
    IF FOUND THEN RETURN v_bill; END IF;
  END IF;

  -- Close any open pauses
  UPDATE session_pauses
  SET resumed_at = now()
  WHERE session_id = p_session_id AND resumed_at IS NULL;

  -- Close open segment
  UPDATE session_segments
  SET ended_at = now()
  WHERE session_id = p_session_id AND ended_at IS NULL;

  -- Mark session completed
  UPDATE sessions
  SET status = 'completed', ended_at = now()
  WHERE id = p_session_id;

  -- Set table free
  UPDATE game_tables
  SET status = 'free'
  WHERE id = v_session.table_id;

  -- Compute table charge & breakdown
  SELECT tc.table_charge, tc.table_breakdown
  INTO v_table_charge, v_breakdown
  FROM fn_compute_table_charge(p_session_id, now()) tc;

  -- Find associated order and compute cafe total
  SELECT o.id INTO v_order_id
  FROM orders o
  WHERE o.session_id = p_session_id
  LIMIT 1;

  IF v_order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(oi.price_snapshot * oi.qty), 0)
    INTO v_cafe_total
    FROM order_items oi
    WHERE oi.order_id = v_order_id;
  END IF;

  -- Check if linked booking has verified deposit
  IF v_session.booking_id IS NOT NULL THEN
    SELECT COALESCE(b.deposit_amount, 0)
    INTO v_deposit_applied
    FROM bookings b
    WHERE b.id = v_session.booking_id AND b.deposit_status = 'verified';
  END IF;

  v_total := GREATEST(0, (v_table_charge + v_cafe_total - v_deposit_applied));

  -- Create or update draft bill
  INSERT INTO bills (
    branch_id,
    kind,
    session_id,
    order_id,
    customer_id,
    status,
    table_charge,
    table_breakdown,
    cafe_total,
    deposit_applied,
    total,
    created_by
  )
  VALUES (
    v_session.branch_id,
    'session',
    p_session_id,
    v_order_id,
    v_session.customer_id,
    'draft',
    v_table_charge,
    v_breakdown,
    v_cafe_total,
    v_deposit_applied,
    v_total,
    auth.uid()
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_bill;

  IF v_bill.id IS NULL THEN
    SELECT * INTO v_bill FROM bills WHERE session_id = p_session_id LIMIT 1;
  END IF;

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, user_id, rpc, result)
    VALUES (p_op_id, auth.uid(), 'rpc_stop_session', to_jsonb(v_bill))
    ON CONFLICT (op_id) DO NOTHING;
  END IF;

  RETURN v_bill;
END;
$$;

-- 8. rpc_set_table_maintenance
CREATE OR REPLACE FUNCTION rpc_set_table_maintenance(
  p_table_id uuid,
  p_on boolean
)
RETURNS game_tables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table game_tables;
BEGIN
  IF NOT fn_is_admin() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Admin role required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_table FROM game_tables WHERE id = p_table_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Table not found' USING ERRCODE = 'P0001';
  END IF;

  IF p_on THEN
    IF v_table.status <> 'free' THEN
      RAISE EXCEPTION 'E_TABLE_BUSY: Cannot set active or paused table to maintenance'
        USING ERRCODE = 'P0001';
    END IF;
    UPDATE game_tables SET status = 'maintenance' WHERE id = p_table_id RETURNING * INTO v_table;
  ELSE
    UPDATE game_tables SET status = 'free' WHERE id = p_table_id RETURNING * INTO v_table;
  END IF;

  RETURN v_table;
END;
$$;
