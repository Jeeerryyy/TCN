-- 0016_payments_rpcs.sql
-- Payments RPCs: order creation, event recording, capture with late-refund safety, refund processing, reconciliation

-- 1. rpc_create_payment_order
CREATE OR REPLACE FUNCTION rpc_create_payment_order(
  p_purpose payment_purpose,
  p_ref_id UUID,
  p_amount_paise INTEGER,
  p_provider TEXT,
  p_provider_order_id TEXT,
  p_idempotency_key TEXT,
  p_customer_id UUID DEFAULT NULL
)
RETURNS payments AS $$
DECLARE
  v_branch_id UUID := '00000000-0000-0000-0000-000000000001';
  v_booking_id UUID := NULL;
  v_bill_id UUID := NULL;
  v_customer_id UUID := p_customer_id;
  v_existing payments;
  v_res payments;
BEGIN
  -- Idempotency check
  SELECT * INTO v_existing FROM payments WHERE idempotency_key = p_idempotency_key;
  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Validate reference based on purpose
  IF p_purpose = 'booking' THEN
    v_booking_id := p_ref_id;
    SELECT customer_id INTO v_customer_id FROM bookings WHERE id = v_booking_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found with ID %', p_ref_id;
    END IF;
  ELSIF p_purpose = 'bill' THEN
    v_bill_id := p_ref_id;
    SELECT customer_id INTO v_customer_id FROM bills WHERE id = v_bill_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bill not found with ID %', p_ref_id;
    END IF;
  END IF;

  INSERT INTO payments (
    branch_id,
    purpose,
    booking_id,
    bill_id,
    customer_id,
    provider,
    provider_order_id,
    amount_paise,
    status,
    idempotency_key
  ) VALUES (
    v_branch_id,
    p_purpose,
    v_booking_id,
    v_bill_id,
    v_customer_id,
    p_provider,
    p_provider_order_id,
    p_amount_paise,
    'pending',
    p_idempotency_key
  )
  RETURNING * INTO v_res;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. rpc_record_payment_event
CREATE OR REPLACE FUNCTION rpc_record_payment_event(
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_type TEXT,
  p_payload JSONB,
  p_payment_id UUID DEFAULT NULL
)
RETURNS payment_events AS $$
DECLARE
  v_event payment_events;
BEGIN
  -- Check if already processed (idempotent)
  SELECT * INTO v_event FROM payment_events WHERE provider_event_id = p_provider_event_id;
  IF v_event.id IS NOT NULL THEN
    RETURN v_event;
  END IF;

  INSERT INTO payment_events (
    provider,
    provider_event_id,
    payment_id,
    type,
    payload
  ) VALUES (
    p_provider,
    p_provider_event_id,
    p_payment_id,
    p_type,
    p_payload
  )
  RETURNING * INTO v_event;

  RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. rpc_verify_and_capture_payment
CREATE OR REPLACE FUNCTION rpc_verify_and_capture_payment(
  p_payment_id UUID,
  p_provider_payment_id TEXT,
  p_method TEXT DEFAULT 'online',
  p_raw JSONB DEFAULT '{}'::jsonb
)
RETURNS payments AS $$
DECLARE
  v_payment payments;
  v_booking bookings;
  v_conflict_count INT := 0;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found with ID %', p_payment_id;
  END IF;

  -- If already captured, return immediately (idempotent)
  IF v_payment.status = 'captured' THEN
    RETURN v_payment;
  END IF;

  -- Booking Flow Rules
  IF v_payment.purpose = 'booking' AND v_payment.booking_id IS NOT NULL THEN
    SELECT * INTO v_booking FROM bookings WHERE id = v_payment.booking_id FOR UPDATE;

    -- Check if booking is still valid or if hold expired
    IF v_booking.status IN ('pending_deposit', 'pending_verification') THEN
      -- Live hold: confirm booking immediately
      UPDATE bookings
      SET
        status = 'confirmed',
        deposit_status = 'verified',
        deposit_mode = 'upi',
        updated_at = v_now
      WHERE id = v_booking.id;

      UPDATE payments
      SET
        status = 'captured',
        provider_payment_id = p_provider_payment_id,
        method = p_method,
        raw = v_payment.raw || p_raw,
        updated_at = v_now
      WHERE id = p_payment_id
      RETURNING * INTO v_payment;

    ELSE
      -- Capture arrived AFTER hold expiry or cancellation
      -- Check if slot is still free
      SELECT count(*) INTO v_conflict_count
      FROM bookings
      WHERE table_type = v_booking.table_type
        AND status IN ('confirmed', 'checked_in')
        AND id <> v_booking.id
        AND tstzrange(start_at, end_at, '[)') && tstzrange(v_booking.start_at, v_booking.end_at, '[)');

      IF v_conflict_count = 0 THEN
        -- Slot is still free: revive and confirm
        UPDATE bookings
        SET
          status = 'confirmed',
          deposit_status = 'verified',
          deposit_mode = 'upi',
          updated_at = v_now
        WHERE id = v_booking.id;

        UPDATE payments
        SET
          status = 'captured',
          provider_payment_id = p_provider_payment_id,
          method = p_method,
          raw = v_payment.raw || p_raw || '{"late_capture_confirmed": true}'::jsonb,
          updated_at = v_now
        WHERE id = p_payment_id
        RETURNING * INTO v_payment;
      ELSE
        -- Slot is NO LONGER FREE: Never double-book! Mark refund_pending and alert admin
        UPDATE payments
        SET
          status = 'refund_pending',
          provider_payment_id = p_provider_payment_id,
          method = p_method,
          failure_reason = 'Slot expired and already booked by another customer. Auto-refund pending.',
          raw = v_payment.raw || p_raw || '{"late_capture_refund_required": true}'::jsonb,
          updated_at = v_now
        WHERE id = p_payment_id
        RETURNING * INTO v_payment;

        -- Admin Alert
        INSERT INTO alerts (branch_id, type, message, ref_id)
        VALUES (
          v_payment.branch_id,
          'payment_late_refund_due',
          'Late payment captured for expired booking #' || substr(v_booking.id::text, 1, 8) || '. Slot was taken; refund required.',
          p_payment_id
        );
      END IF;
    END IF;

  ELSIF v_payment.purpose = 'bill' AND v_payment.bill_id IS NOT NULL THEN
    -- Finalize bill payment
    UPDATE payments
    SET
      status = 'captured',
      provider_payment_id = p_provider_payment_id,
      method = p_method,
      raw = v_payment.raw || p_raw,
      updated_at = v_now
    WHERE id = p_payment_id
    RETURNING * INTO v_payment;

    -- Record in bill_payments
    INSERT INTO bill_payments (branch_id, bill_id, mode, amount, payer_label)
    VALUES (
      v_payment.branch_id,
      v_payment.bill_id,
      'online',
      (v_payment.amount_paise / 100)::numeric(10,2),
      'Online Gateway (' || v_payment.provider || ')'
    );

  ELSE
    -- Generic payment capture
    UPDATE payments
    SET
      status = 'captured',
      provider_payment_id = p_provider_payment_id,
      method = p_method,
      raw = v_payment.raw || p_raw,
      updated_at = v_now
    WHERE id = p_payment_id
    RETURNING * INTO v_payment;
  END IF;

  RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. rpc_process_refund
CREATE OR REPLACE FUNCTION rpc_process_refund(
  p_payment_id UUID,
  p_amount_paise INTEGER,
  p_reason TEXT,
  p_provider_refund_id TEXT DEFAULT NULL,
  p_requested_by UUID DEFAULT NULL
)
RETURNS refunds AS $$
DECLARE
  v_payment payments;
  v_refund refunds;
  v_new_status payment_status;
  v_total_refunded INTEGER := 0;
  v_caller_id UUID := COALESCE(p_requested_by, auth.uid());
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found with ID %', p_payment_id;
  END IF;

  SELECT COALESCE(sum(amount_paise), 0) INTO v_total_refunded
  FROM refunds
  WHERE payment_id = p_payment_id AND status = 'succeeded';

  IF (v_total_refunded + p_amount_paise) > v_payment.amount_paise THEN
    RAISE EXCEPTION 'Refund amount exceeds captured payment amount.';
  END IF;

  -- Insert into refunds
  INSERT INTO refunds (
    payment_id,
    provider_refund_id,
    amount_paise,
    status,
    reason,
    requested_by
  ) VALUES (
    p_payment_id,
    COALESCE(p_provider_refund_id, 'ref_' || substr(gen_random_uuid()::text, 1, 12)),
    p_amount_paise,
    'succeeded',
    p_reason,
    v_caller_id
  )
  RETURNING * INTO v_refund;

  -- Determine payment status
  IF (v_total_refunded + p_amount_paise) >= v_payment.amount_paise THEN
    v_new_status := 'refunded';
  ELSE
    v_new_status := 'partially_refunded';
  END IF;

  UPDATE payments
  SET
    status = v_new_status,
    updated_at = now()
  WHERE id = p_payment_id;

  -- If booking associated, update deposit status
  IF v_payment.booking_id IS NOT NULL THEN
    UPDATE bookings
    SET
      deposit_status = 'refunded',
      updated_at = now()
    WHERE id = v_payment.booking_id;
  END IF;

  -- Write to audit log
  INSERT INTO audit_log (branch_id, user_id, action, target_type, target_id, details)
  VALUES (
    v_payment.branch_id,
    v_caller_id,
    'refund_processed',
    'payment',
    p_payment_id,
    jsonb_build_object(
      'amount_paise', p_amount_paise,
      'reason', p_reason,
      'refund_id', v_refund.id,
      'provider_refund_id', v_refund.provider_refund_id
    )
  );

  RETURN v_refund;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. fn_reconcile_payments (Cron runs every 5 minutes)
CREATE OR REPLACE FUNCTION fn_reconcile_payments()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_p RECORD;
BEGIN
  -- Find pending payments older than 15 minutes
  FOR v_p IN
    SELECT id, branch_id, provider, provider_order_id, created_at
    FROM payments
    WHERE status = 'pending'
      AND created_at < now() - INTERVAL '15 minutes'
      AND created_at > now() - INTERVAL '24 hours'
  LOOP
    -- Flag for reconciliation review
    UPDATE payments
    SET
      status = 'expired',
      failure_reason = 'Payment order timed out after 15 minutes of inactivity',
      updated_at = now()
    WHERE id = v_p.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
