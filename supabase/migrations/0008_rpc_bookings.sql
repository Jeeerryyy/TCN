-- 0008_rpc_bookings.sql
-- TCN Technical Requirements Document (TRD) Section 8, 13 & PRD Traces S-20..S-23, A-02, A-04, A-21, A-22, P-01..P-05, Y-01, Y-02

-- 1. Helper function to generate unique short booking code
CREATE OR REPLACE FUNCTION fn_generate_booking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := 'TCN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS (SELECT 1 FROM bookings WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 2. rpc_create_booking
CREATE OR REPLACE FUNCTION rpc_create_booking(
  p_source booking_source,
  p_table_type table_type,
  p_table_id uuid,
  p_start_at timestamptz,
  p_hours int,
  p_name text,
  p_phone text,
  p_deposit_mode pay_mode DEFAULT NULL,
  p_utr text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_customer_id uuid;
  v_table_id uuid := p_table_id;
  v_end_at timestamptz;
  v_deposit_amount numeric(10,2) := 100.00;
  v_hold_minutes int := 30;
  v_code text;
  v_status booking_status;
  v_dep_status deposit_status;
  v_booking_id uuid;
  v_res jsonb;
BEGIN
  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'E_VALIDATION: Customer name is required';
  END IF;

  IF length(regexp_replace(p_phone, '\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'E_VALIDATION: 10-digit phone number is required';
  END IF;

  IF p_hours < 1 OR p_hours > 12 THEN
    RAISE EXCEPTION 'E_VALIDATION: Booking duration must be between 1 and 12 hours';
  END IF;

  v_end_at := p_start_at + (p_hours * interval '1 hour');
  IF v_end_at <= p_start_at THEN
    RAISE EXCEPTION 'E_VALIDATION: End time must be after start time';
  END IF;

  -- Default branch
  SELECT id INTO v_branch_id FROM branches LIMIT 1;
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'E_NOT_FOUND: No branch configured';
  END IF;

  -- Load deposit settings
  SELECT coalesce((value)::numeric, 100.00) INTO v_deposit_amount
  FROM settings WHERE branch_id = v_branch_id AND key = 'deposit.amount';
  IF v_deposit_amount IS NULL THEN v_deposit_amount := 100.00; END IF;

  SELECT coalesce((value)::int, 30) INTO v_hold_minutes
  FROM settings WHERE branch_id = v_branch_id AND key = 'booking.hold_minutes';
  IF v_hold_minutes IS NULL THEN v_hold_minutes := 30; END IF;

  -- Upsert customer record
  v_customer_id := rpc_upsert_customer(trim(p_phone), trim(p_name));

  -- Assign table if not provided
  IF v_table_id IS NULL THEN
    SELECT t.id INTO v_table_id
    FROM game_tables t
    WHERE t.branch_id = v_branch_id
      AND t.type = p_table_type
      AND t.active = true
      AND t.status != 'maintenance'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.table_id = t.id
          AND b.status IN ('pending_deposit', 'pending_verification', 'confirmed', 'checked_in')
          AND tstzrange(b.start_at, b.end_at) && tstzrange(p_start_at, v_end_at)
          AND (b.status != 'pending_deposit' OR b.hold_until > now())
      )
    ORDER BY t.name ASC
    LIMIT 1;

    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'E_TABLE_BUSY: No available table of type % for the requested slot', p_table_type;
    END IF;
  ELSE
    -- Verify provided table
    IF NOT EXISTS (
      SELECT 1 FROM game_tables
      WHERE id = v_table_id AND branch_id = v_branch_id AND type = p_table_type AND active = true AND status != 'maintenance'
    ) THEN
      RAISE EXCEPTION 'E_NOT_FOUND: Table is not valid or active for this game type';
    END IF;

    -- Verify no overlap
    IF EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.table_id = v_table_id
        AND b.status IN ('pending_deposit', 'pending_verification', 'confirmed', 'checked_in')
        AND tstzrange(b.start_at, b.end_at) && tstzrange(p_start_at, v_end_at)
        AND (b.status != 'pending_deposit' OR b.hold_until > now())
    ) THEN
      RAISE EXCEPTION 'E_TABLE_BUSY: Selected table is already booked for this slot';
    END IF;
  END IF;

  v_code := fn_generate_booking_code();

  IF p_source IN ('walk_in', 'phone') THEN
    v_status := 'confirmed';
    v_dep_status := 'verified';
  ELSE
    v_status := 'pending_deposit';
    v_dep_status := 'pending';
  END IF;

  INSERT INTO bookings (
    branch_id,
    code,
    customer_id,
    name,
    phone,
    table_type,
    table_id,
    start_at,
    end_at,
    source,
    status,
    deposit_amount,
    deposit_status,
    deposit_method,
    utr,
    verified_by,
    hold_until,
    created_by
  ) VALUES (
    v_branch_id,
    v_code,
    v_customer_id,
    trim(p_name),
    trim(p_phone),
    p_table_type,
    v_table_id,
    p_start_at,
    v_end_at,
    p_source,
    v_status,
    v_deposit_amount,
    v_dep_status,
    p_deposit_mode,
    p_utr,
    CASE WHEN v_status = 'confirmed' THEN auth.uid() ELSE NULL END,
    CASE WHEN v_status = 'pending_deposit' THEN now() + (v_hold_minutes * interval '1 minute') ELSE NULL END,
    auth.uid()
  )
  RETURNING id INTO v_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_res
  FROM (
    SELECT bk.*, gt.name AS table_name
    FROM bookings bk
    LEFT JOIN game_tables gt ON gt.id = bk.table_id
    WHERE bk.id = v_booking_id
  ) b;

  RETURN v_res;
END;
$$;

-- 3. rpc_confirm_deposit (S-22, A-04)
CREATE OR REPLACE FUNCTION rpc_confirm_deposit(
  p_booking_id uuid,
  p_utr text,
  p_method pay_mode
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = p_booking_id) THEN
    RAISE EXCEPTION 'E_NOT_FOUND: Booking not found';
  END IF;

  UPDATE bookings
  SET deposit_status = 'verified',
      deposit_method = p_method,
      utr = coalesce(p_utr, utr),
      verified_by = auth.uid(),
      status = 'confirmed'
  WHERE id = p_booking_id
    AND status IN ('pending_deposit', 'pending_verification');

  -- Resolve any pending alerts for this booking
  UPDATE alerts
  SET resolved_at = now()
  WHERE type = 'deposit_pending' AND ref_id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_res
  FROM (
    SELECT bk.*, gt.name AS table_name
    FROM bookings bk
    LEFT JOIN game_tables gt ON gt.id = bk.table_id
    WHERE bk.id = p_booking_id
  ) b;

  RETURN v_res;
END;
$$;

-- 4. rpc_decide_booking (A-21)
CREATE OR REPLACE FUNCTION rpc_decide_booking(
  p_booking_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = p_booking_id) THEN
    RAISE EXCEPTION 'E_NOT_FOUND: Booking not found';
  END IF;

  IF p_approve THEN
    UPDATE bookings
    SET status = 'confirmed',
        deposit_status = 'verified',
        verified_by = auth.uid()
    WHERE id = p_booking_id;
  ELSE
    UPDATE bookings
    SET status = 'cancelled',
        cancel_reason = coalesce(p_reason, 'Rejected by admin'),
        deposit_status = 'forfeited'
    WHERE id = p_booking_id;
  END IF;

  UPDATE alerts
  SET resolved_at = now()
  WHERE type = 'deposit_pending' AND ref_id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_res
  FROM (
    SELECT bk.*, gt.name AS table_name
    FROM bookings bk
    LEFT JOIN game_tables gt ON gt.id = bk.table_id
    WHERE bk.id = p_booking_id
  ) b;

  RETURN v_res;
END;
$$;

-- 5. rpc_cancel_booking (S-23)
CREATE OR REPLACE FUNCTION rpc_cancel_booking(
  p_booking_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_refund_hours int := 2;
  v_new_dep_status deposit_status;
  v_res jsonb;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_NOT_FOUND: Booking not found';
  END IF;

  IF v_booking.status IN ('completed', 'cancelled', 'no_show', 'expired') THEN
    RAISE EXCEPTION 'E_BAD_STATE: Booking is already in a final state (%)', v_booking.status;
  END IF;

  SELECT coalesce((value)::int, 2) INTO v_refund_hours
  FROM settings WHERE branch_id = v_booking.branch_id AND key = 'deposit.refund_hours';
  IF v_refund_hours IS NULL THEN v_refund_hours := 2; END IF;

  IF v_booking.deposit_status = 'verified' THEN
    IF now() <= (v_booking.start_at - (v_refund_hours * interval '1 hour')) THEN
      v_new_dep_status := 'refund_due';
    ELSE
      v_new_dep_status := 'forfeited';
    END IF;
  ELSE
    v_new_dep_status := v_booking.deposit_status;
  END IF;

  UPDATE bookings
  SET status = 'cancelled',
      cancel_reason = p_reason,
      deposit_status = v_new_dep_status
  WHERE id = p_booking_id;

  UPDATE alerts
  SET resolved_at = now()
  WHERE type = 'deposit_pending' AND ref_id = p_booking_id;

  SELECT row_to_json(b)::jsonb INTO v_res
  FROM (
    SELECT bk.*, gt.name AS table_name
    FROM bookings bk
    LEFT JOIN game_tables gt ON gt.id = bk.table_id
    WHERE bk.id = p_booking_id
  ) b;

  RETURN v_res;
END;
$$;

-- 6. rpc_mark_no_show (A-22)
CREATE OR REPLACE FUNCTION rpc_mark_no_show(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE id = p_booking_id) THEN
    RAISE EXCEPTION 'E_NOT_FOUND: Booking not found';
  END IF;

  UPDATE bookings
  SET status = 'no_show',
      deposit_status = CASE WHEN deposit_status = 'verified' THEN 'forfeited'::deposit_status ELSE deposit_status END
  WHERE id = p_booking_id
    AND status IN ('confirmed', 'pending_deposit', 'pending_verification');

  SELECT row_to_json(b)::jsonb INTO v_res
  FROM (
    SELECT bk.*, gt.name AS table_name
    FROM bookings bk
    LEFT JOIN game_tables gt ON gt.id = bk.table_id
    WHERE bk.id = p_booking_id
  ) b;

  RETURN v_res;
END;
$$;

-- 7. rpc_public_availability (P-01, P-02)
CREATE OR REPLACE FUNCTION rpc_public_availability(
  p_date date,
  p_table_type table_type
)
RETURNS TABLE (
  slot_hour int,
  slot_time text,
  available_count int,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_total_tables int;
  v_tz text := 'Asia/Kolkata';
  v_h int;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_booked_count int;
  v_avail int;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  SELECT count(*) INTO v_total_tables
  FROM game_tables
  WHERE branch_id = v_branch_id
    AND type = p_table_type
    AND active = true
    AND status != 'maintenance';

  -- Loop through operational hours (10:00 to 23:00)
  FOR v_h IN 10..23 LOOP
    -- Compute slot timestamptz in timezone
    v_slot_start := (p_date::text || ' ' || lpad(v_h::text, 2, '0') || ':00:00')::timestamp AT TIME ZONE v_tz;
    v_slot_end := v_slot_start + interval '1 hour';

    -- Count active bookings that overlap this slot
    SELECT count(DISTINCT table_id) INTO v_booked_count
    FROM bookings
    WHERE branch_id = v_branch_id
      AND table_type = p_table_type
      AND table_id IS NOT NULL
      AND status IN ('pending_deposit', 'pending_verification', 'confirmed', 'checked_in')
      AND tstzrange(start_at, end_at) && tstzrange(v_slot_start, v_slot_end)
      AND (status != 'pending_deposit' OR hold_until > now());

    v_avail := greatest(0, v_total_tables - coalesce(v_booked_count, 0));

    slot_hour := v_h;
    slot_time := to_char(v_slot_start, 'HH12:MI AM');
    available_count := v_avail;
    is_available := (v_avail > 0 AND v_slot_start > now());
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 8. rpc_public_info
CREATE OR REPLACE FUNCTION rpc_public_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_name text := 'TCN – The Cue Nation';
  v_dep numeric(10,2) := 100.00;
  v_vpa text := 'thecuenation@upi';
  v_payee text := 'The Cue Nation';
  v_slot_min int := 60;
  v_hold_min int := 30;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  SELECT coalesce(value#>>'{}', 'TCN – The Cue Nation') INTO v_name
  FROM settings WHERE branch_id = v_branch_id AND key = 'business.name';

  SELECT coalesce((value#>>'{}')::numeric, 100.00) INTO v_dep
  FROM settings WHERE branch_id = v_branch_id AND key = 'deposit.amount';

  SELECT coalesce(value#>>'{}', 'thecuenation@upi') INTO v_vpa
  FROM settings WHERE branch_id = v_branch_id AND key = 'upi.vpa';

  SELECT coalesce(value#>>'{}', 'The Cue Nation') INTO v_payee
  FROM settings WHERE branch_id = v_branch_id AND key = 'upi.payee_name';

  SELECT coalesce((value#>>'{}')::int, 60) INTO v_slot_min
  FROM settings WHERE branch_id = v_branch_id AND key = 'booking.slot_minutes';

  SELECT coalesce((value#>>'{}')::int, 30) INTO v_hold_min
  FROM settings WHERE branch_id = v_branch_id AND key = 'booking.hold_minutes';

  RETURN jsonb_build_object(
    'venue_name', v_name,
    'deposit_amount', v_dep,
    'upi_vpa', v_vpa,
    'upi_payee_name', v_payee,
    'slot_minutes', v_slot_min,
    'hold_minutes', v_hold_min
  );
END;
$$;

-- 9. rpc_submit_public_utr (P-04)
CREATE OR REPLACE FUNCTION rpc_submit_public_utr(
  p_code text,
  p_phone text,
  p_utr text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_phone text;
  v_booking bookings%ROWTYPE;
  v_res jsonb;
BEGIN
  IF trim(p_utr) = '' THEN
    RAISE EXCEPTION 'E_VALIDATION: Transaction UTR is required';
  END IF;

  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');

  SELECT * INTO v_booking
  FROM bookings
  WHERE upper(code) = upper(trim(p_code))
    AND regexp_replace(phone, '\D', '', 'g') = v_clean_phone;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_NOT_FOUND: No booking found with this code and phone number';
  END IF;

  IF v_booking.status NOT IN ('pending_deposit', 'pending_verification') THEN
    RAISE EXCEPTION 'E_BAD_STATE: Booking is already %', v_booking.status;
  END IF;

  UPDATE bookings
  SET utr = trim(p_utr),
      status = 'pending_verification',
      deposit_status = 'pending'
  WHERE id = v_booking.id;

  -- Create alert for staff/admin (Y-01)
  INSERT INTO alerts (
    branch_id,
    type,
    ref_id,
    message,
    audience
  ) VALUES (
    v_booking.branch_id,
    'deposit_pending',
    v_booking.id,
    'Deposit verification needed for ' || v_booking.name || ' (UTR: ' || trim(p_utr) || ')',
    ARRAY['admin'::user_role, 'staff'::user_role]
  )
  ON CONFLICT DO NOTHING;

  SELECT row_to_json(b)::jsonb INTO v_res
  FROM (
    SELECT bk.*, gt.name AS table_name
    FROM bookings bk
    LEFT JOIN game_tables gt ON gt.id = bk.table_id
    WHERE bk.id = v_booking.id
  ) b;

  RETURN v_res;
END;
$$;

-- 10. rpc_public_booking_status (P-05)
CREATE OR REPLACE FUNCTION rpc_public_booking_status(
  p_code text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_phone text;
  v_res jsonb;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');

  SELECT jsonb_build_object(
    'code', bk.code,
    'name', bk.name,
    'table_type', bk.table_type,
    'table_name', gt.name,
    'start_at', bk.start_at,
    'end_at', bk.end_at,
    'status', bk.status,
    'deposit_amount', bk.deposit_amount,
    'deposit_status', bk.deposit_status,
    'utr', bk.utr,
    'hold_until', bk.hold_until
  ) INTO v_res
  FROM bookings bk
  LEFT JOIN game_tables gt ON gt.id = bk.table_id
  WHERE upper(bk.code) = upper(trim(p_code))
    AND regexp_replace(bk.phone, '\D', '', 'g') = v_clean_phone;

  IF v_res IS NULL THEN
    RAISE EXCEPTION 'E_NOT_FOUND: No booking found with this code and phone number';
  END IF;

  RETURN v_res;
END;
$$;

-- 11. fn_generate_alerts (Y-01)
CREATE OR REPLACE FUNCTION fn_generate_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
BEGIN
  -- 1. Deposit pending verification
  FOR v_rec IN
    SELECT b.id, b.branch_id, b.name, b.utr
    FROM bookings b
    WHERE b.status = 'pending_verification'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.type = 'deposit_pending' AND a.ref_id = b.id AND a.resolved_at IS NULL
      )
  LOOP
    INSERT INTO alerts (branch_id, type, ref_id, message, audience)
    VALUES (
      v_rec.branch_id,
      'deposit_pending',
      v_rec.id,
      'Deposit pending verification: ' || v_rec.name || coalesce(' (UTR ' || v_rec.utr || ')', ''),
      ARRAY['admin'::user_role, 'staff'::user_role]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 2. Discount requests pending
  FOR v_rec IN
    SELECT dr.id, b.branch_id, dr.value, dr.type, dr.reason
    FROM discount_requests dr
    JOIN bills b ON b.id = dr.bill_id
    WHERE dr.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.type = 'discount_request' AND a.ref_id = dr.id AND a.resolved_at IS NULL
      )
  LOOP
    INSERT INTO alerts (branch_id, type, ref_id, message, audience)
    VALUES (
      v_rec.branch_id,
      'discount_request',
      v_rec.id,
      'Discount request: ' || v_rec.value || CASE WHEN v_rec.type = 'percent' THEN '%' ELSE ' INR' END || ' (' || v_rec.reason || ')',
      ARRAY['admin'::user_role]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 3. Sessions paused too long (> 15 min default)
  FOR v_rec IN
    SELECT s.id, s.branch_id, gt.name AS table_name, p.paused_at
    FROM sessions s
    JOIN game_tables gt ON gt.id = s.table_id
    JOIN session_pauses p ON p.session_id = s.id AND p.resumed_at IS NULL
    WHERE s.status = 'paused'
      AND p.paused_at < (now() - interval '15 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.type = 'session_paused_long' AND a.ref_id = s.id AND a.resolved_at IS NULL
      )
  LOOP
    INSERT INTO alerts (branch_id, type, ref_id, message, audience)
    VALUES (
      v_rec.branch_id,
      'session_paused_long',
      v_rec.id,
      v_rec.table_name || ' has been paused for more than 15 minutes',
      ARRAY['admin'::user_role, 'staff'::user_role]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 4. Table idle free > 60 min
  FOR v_rec IN
    SELECT gt.id, gt.branch_id, gt.name
    FROM game_tables gt
    WHERE gt.active = true
      AND gt.status = 'free'
      AND NOT EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.table_id = gt.id AND s.ended_at > (now() - interval '60 minutes')
      )
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        WHERE a.type = 'table_idle' AND a.ref_id = gt.id AND a.resolved_at IS NULL
      )
  LOOP
    INSERT INTO alerts (branch_id, type, ref_id, message, audience)
    VALUES (
      v_rec.branch_id,
      'table_idle',
      v_rec.id,
      v_rec.name || ' has been idle for over 60 minutes',
      ARRAY['admin'::user_role]
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- 12. fn_expire_bookings (Y-02)
CREATE OR REPLACE FUNCTION fn_expire_bookings()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  WITH expired AS (
    UPDATE bookings
    SET status = 'expired'
    WHERE status = 'pending_deposit'
      AND hold_until IS NOT NULL
      AND hold_until < now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

-- 13. rpc_ack_alert (A-02)
CREATE OR REPLACE FUNCTION rpc_ack_alert(
  p_alert_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  UPDATE alerts
  SET acked_by = auth.uid(),
      acked_at = now()
  WHERE id = p_alert_id;

  SELECT row_to_json(a)::jsonb INTO v_res
  FROM alerts a
  WHERE a.id = p_alert_id;

  RETURN v_res;
END;
$$;
