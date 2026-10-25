-- 0007_rpc_discounts_memberships.sql
-- TCN Technical Requirements Document (TRD) Section 8 & PRD Section 7 (Traces S-41, S-42, S-45, A-03, A-42, A-43)

-- 1. rpc_request_discount
CREATE OR REPLACE FUNCTION rpc_request_discount(
  p_bill_id uuid,
  p_type discount_type,
  p_value numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill bills%ROWTYPE;
  v_req_id uuid;
  v_actor_id uuid := auth.uid();
  v_discount_amt numeric(10,2);
  v_subtotal numeric(10,2);
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: User is not active' USING ERRCODE = 'P0001';
  END IF;

  IF p_value <= 0 THEN
    RAISE EXCEPTION 'E_VALIDATION: Discount value must be greater than zero' USING ERRCODE = 'P0001';
  END IF;

  IF p_type = 'percent' AND p_value > 100 THEN
    RAISE EXCEPTION 'E_VALIDATION: Discount percentage cannot exceed 100' USING ERRCODE = 'P0001';
  END IF;

  IF length(trim(COALESCE(p_reason, ''))) < 4 THEN
    RAISE EXCEPTION 'E_VALIDATION: A valid reason (min 4 characters) is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Bill not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_bill.status <> 'draft' THEN
    RAISE EXCEPTION 'E_BAD_STATE: Discounts can only be requested on draft bills' USING ERRCODE = 'P0001';
  END IF;

  v_subtotal := v_bill.table_charge + v_bill.cafe_total;
  IF p_type = 'percent' THEN
    v_discount_amt := round(v_subtotal * (p_value / 100.0), 2);
  ELSE
    v_discount_amt := least(p_value, v_subtotal);
  END IF;

  INSERT INTO discount_requests (
    bill_id,
    type,
    value,
    reason,
    status,
    requested_by
  )
  VALUES (
    p_bill_id,
    p_type,
    p_value,
    trim(p_reason),
    'pending',
    v_actor_id
  )
  RETURNING id INTO v_req_id;

  -- Create alert for admins
  INSERT INTO alerts (
    branch_id,
    type,
    ref_id,
    message,
    audience
  )
  VALUES (
    v_bill.branch_id,
    'discount_request',
    v_req_id,
    'Discount request for Bill #' || v_bill.bill_no || ' (' || 
      CASE WHEN p_type = 'percent' THEN p_value || '%' ELSE '₹' || p_value END || '): ' || trim(p_reason),
    ARRAY['admin'::user_role]
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_req_id,
    'status', 'pending',
    'calculated_discount', v_discount_amt
  );
END;
$$;

-- 2. rpc_decide_discount
CREATE OR REPLACE FUNCTION rpc_decide_discount(
  p_request_id uuid,
  p_approve boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req discount_requests%ROWTYPE;
  v_bill bills%ROWTYPE;
  v_admin_id uuid := auth.uid();
  v_discount_amt numeric(10,2);
  v_subtotal numeric(10,2);
  v_new_total numeric(10,2);
BEGIN
  IF NOT fn_is_admin() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Only admin can decide discount requests' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_req FROM discount_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Discount request not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'E_BAD_STATE: Discount request is already decided' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_bill FROM bills WHERE id = v_req.bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Linked bill not found' USING ERRCODE = 'P0001';
  END IF;

  IF p_approve THEN
    v_subtotal := v_bill.table_charge + v_bill.cafe_total;
    IF v_req.type = 'percent' THEN
      v_discount_amt := round(v_subtotal * (v_req.value / 100.0), 2);
    ELSE
      v_discount_amt := least(v_req.value, v_subtotal);
    END IF;

    v_new_total := greatest(0, v_subtotal - v_discount_amt - v_bill.deposit_applied - v_bill.loyalty_redeemed);

    UPDATE bills
    SET
      discount_type = v_req.type,
      discount_value = v_req.value,
      discount_amount = v_discount_amt,
      discount_reason = v_req.reason,
      discount_approved_by = v_admin_id,
      total = v_new_total
    WHERE id = v_bill.id;

    UPDATE discount_requests
    SET
      status = 'approved',
      decided_by = v_admin_id,
      decided_at = now()
    WHERE id = v_req.id;

    -- Resolve related alert
    UPDATE alerts
    SET
      resolved_at = now(),
      acked_by = v_admin_id,
      acked_at = now()
    WHERE type = 'discount_request' AND ref_id = v_req.id AND resolved_at IS NULL;

    INSERT INTO audit_log (branch_id, actor_id, action, entity, entity_id, before, after)
    VALUES (
      v_bill.branch_id,
      v_admin_id,
      'discount_approved',
      'bills',
      v_bill.id,
      jsonb_build_object('discount_amount', v_bill.discount_amount, 'total', v_bill.total),
      jsonb_build_object('discount_amount', v_discount_amt, 'total', v_new_total)
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'bill_id', v_bill.id,
      'discount_amount', v_discount_amt,
      'total', v_new_total
    );
  ELSE
    UPDATE discount_requests
    SET
      status = 'rejected',
      decided_by = v_admin_id,
      decided_at = now()
    WHERE id = v_req.id;

    UPDATE alerts
    SET
      resolved_at = now(),
      acked_by = v_admin_id,
      acked_at = now()
    WHERE type = 'discount_request' AND ref_id = v_req.id AND resolved_at IS NULL;

    INSERT INTO audit_log (branch_id, actor_id, action, entity, entity_id, before, after)
    VALUES (
      v_bill.branch_id,
      v_admin_id,
      'discount_rejected',
      'discount_requests',
      v_req.id,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'rejected')
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'bill_id', v_bill.id
    );
  END IF;
END;
$$;

-- 3. rpc_set_admin_pin
CREATE OR REPLACE FUNCTION rpc_set_admin_pin(
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
BEGIN
  IF NOT fn_is_admin() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Only admin can set approval PIN' USING ERRCODE = 'P0001';
  END IF;

  IF length(trim(COALESCE(p_pin, ''))) < 4 THEN
    RAISE EXCEPTION 'E_VALIDATION: PIN must be at least 4 digits' USING ERRCODE = 'P0001';
  END IF;

  UPDATE profiles
  SET approval_pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = v_admin_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. rpc_apply_discount_with_pin
CREATE OR REPLACE FUNCTION rpc_apply_discount_with_pin(
  p_bill_id uuid,
  p_type discount_type,
  p_value numeric,
  p_reason text,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill bills%ROWTYPE;
  v_actor_id uuid := auth.uid();
  v_matched_admin_id uuid;
  v_pin_key text := 'admin_pin_verify';
  v_attempt pin_attempts%ROWTYPE;
  v_subtotal numeric(10,2);
  v_discount_amt numeric(10,2);
  v_new_total numeric(10,2);
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: User is not active' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Check lockout status
  SELECT * INTO v_attempt FROM pin_attempts WHERE key = v_pin_key;
  IF FOUND AND v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > now() THEN
    RAISE EXCEPTION 'E_PIN_LOCKED: PIN verification locked until %. Please wait.', v_attempt.locked_until USING ERRCODE = 'P0001';
  END IF;

  -- 2. Verify PIN against any active admin
  SELECT id INTO v_matched_admin_id
  FROM profiles
  WHERE role = 'admin'
    AND active = true
    AND approval_pin_hash IS NOT NULL
    AND approval_pin_hash = crypt(p_pin, approval_pin_hash)
  LIMIT 1;

  IF v_matched_admin_id IS NULL THEN
    -- Increment failure count
    INSERT INTO pin_attempts (key, fails, locked_until)
    VALUES (v_pin_key, 1, NULL)
    ON CONFLICT (key) DO UPDATE
    SET fails = pin_attempts.fails + 1,
        locked_until = CASE WHEN pin_attempts.fails + 1 >= 5 THEN now() + interval '5 minutes' ELSE NULL END;

    RAISE EXCEPTION 'E_PIN_INVALID: Invalid Admin PIN' USING ERRCODE = 'P0001';
  END IF;

  -- Success: reset pin_attempts
  INSERT INTO pin_attempts (key, fails, locked_until)
  VALUES (v_pin_key, 0, NULL)
  ON CONFLICT (key) DO UPDATE
  SET fails = 0, locked_until = NULL;

  -- 3. Validate inputs
  IF p_value <= 0 THEN
    RAISE EXCEPTION 'E_VALIDATION: Discount value must be greater than zero' USING ERRCODE = 'P0001';
  END IF;

  IF p_type = 'percent' AND p_value > 100 THEN
    RAISE EXCEPTION 'E_VALIDATION: Discount percentage cannot exceed 100' USING ERRCODE = 'P0001';
  END IF;

  IF length(trim(COALESCE(p_reason, ''))) < 4 THEN
    RAISE EXCEPTION 'E_VALIDATION: A valid reason (min 4 characters) is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Bill not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_bill.status <> 'draft' THEN
    RAISE EXCEPTION 'E_BAD_STATE: Discounts can only be applied to draft bills' USING ERRCODE = 'P0001';
  END IF;

  v_subtotal := v_bill.table_charge + v_bill.cafe_total;
  IF p_type = 'percent' THEN
    v_discount_amt := round(v_subtotal * (p_value / 100.0), 2);
  ELSE
    v_discount_amt := least(p_value, v_subtotal);
  END IF;

  v_new_total := greatest(0, v_subtotal - v_discount_amt - v_bill.deposit_applied - v_bill.loyalty_redeemed);

  UPDATE bills
  SET
    discount_type = p_type,
    discount_value = p_value,
    discount_amount = v_discount_amt,
    discount_reason = trim(p_reason),
    discount_approved_by = v_matched_admin_id,
    total = v_new_total
  WHERE id = v_bill.id;

  INSERT INTO audit_log (branch_id, actor_id, action, entity, entity_id, before, after)
  VALUES (
    v_bill.branch_id,
    v_actor_id,
    'discount_pin_applied',
    'bills',
    v_bill.id,
    jsonb_build_object('discount_amount', v_bill.discount_amount, 'total', v_bill.total),
    jsonb_build_object('discount_amount', v_discount_amt, 'total', v_new_total, 'approver_id', v_matched_admin_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'bill_id', v_bill.id,
    'discount_amount', v_discount_amt,
    'total', v_new_total,
    'approver_id', v_matched_admin_id
  );
END;
$$;

-- 5. rpc_sell_membership
CREATE OR REPLACE FUNCTION rpc_sell_membership(
  p_customer_id uuid,
  p_plan_id uuid,
  p_payments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan membership_plans%ROWTYPE;
  v_customer customers%ROWTYPE;
  v_branch_id uuid;
  v_actor_id uuid := auth.uid();
  v_bill_id uuid;
  v_membership_id uuid;
  v_starts_on date := CURRENT_DATE;
  v_ends_on date;
  v_existing_ends_on date;
  v_item jsonb;
  v_mode pay_mode;
  v_amt numeric(10,2);
  v_total_paid numeric(10,2) := 0;
BEGIN
  IF NOT fn_is_active() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: User is not active' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Customer not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_plan FROM membership_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Membership plan not found' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_plan.active THEN
    RAISE EXCEPTION 'E_BAD_STATE: Membership plan is inactive' USING ERRCODE = 'P0001';
  END IF;

  v_branch_id := v_plan.branch_id;

  -- Validate payments sum equals plan price
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_amt := (v_item->>'amount')::numeric;
    IF v_amt <= 0 THEN
      RAISE EXCEPTION 'E_VALIDATION: Payment amount must be positive' USING ERRCODE = 'P0001';
    END IF;
    v_total_paid := v_total_paid + v_amt;
  END LOOP;

  IF v_total_paid <> v_plan.price THEN
    RAISE EXCEPTION 'E_VALIDATION: Payments sum (%) must match membership price (%)', v_total_paid, v_plan.price USING ERRCODE = 'P0001';
  END IF;

  -- Check if customer already has active membership to extend
  SELECT max(ends_on) INTO v_existing_ends_on
  FROM customer_memberships
  WHERE customer_id = p_customer_id
    AND ends_on >= CURRENT_DATE;

  IF v_existing_ends_on IS NOT NULL THEN
    v_starts_on := v_existing_ends_on + interval '1 day';
  END IF;

  v_ends_on := v_starts_on + (v_plan.duration_days || ' days')::interval;

  -- 1. Create paid bill
  INSERT INTO bills (
    branch_id,
    kind,
    customer_id,
    status,
    table_charge,
    cafe_total,
    total,
    created_by,
    paid_at
  )
  VALUES (
    v_branch_id,
    'membership',
    p_customer_id,
    'paid',
    0,
    0,
    v_plan.price,
    v_actor_id,
    now()
  )
  RETURNING id INTO v_bill_id;

  -- 2. Insert bill payments
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_mode := (v_item->>'mode')::pay_mode;
    v_amt := (v_item->>'amount')::numeric;

    INSERT INTO bill_payments (
      bill_id,
      mode,
      amount,
      payer_label,
      created_by
    )
    VALUES (
      v_bill_id,
      v_mode,
      v_amt,
      v_item->>'payer_label',
      v_actor_id
    );
  END LOOP;

  -- 3. Create customer membership record
  INSERT INTO customer_memberships (
    customer_id,
    plan_id,
    starts_on,
    ends_on,
    bill_id
  )
  VALUES (
    p_customer_id,
    p_plan_id,
    v_starts_on,
    v_ends_on,
    v_bill_id
  )
  RETURNING id INTO v_membership_id;

  -- 4. Audit
  INSERT INTO audit_log (branch_id, actor_id, action, entity, entity_id, after)
  VALUES (
    v_branch_id,
    v_actor_id,
    'membership_sold',
    'customer_memberships',
    v_membership_id,
    jsonb_build_object(
      'customer_id', p_customer_id,
      'plan_id', p_plan_id,
      'starts_on', v_starts_on,
      'ends_on', v_ends_on,
      'bill_id', v_bill_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'membership_id', v_membership_id,
    'bill_id', v_bill_id,
    'starts_on', v_starts_on,
    'ends_on', v_ends_on
  );
END;
$$;

-- 6. rpc_adjust_points
CREATE OR REPLACE FUNCTION rpc_adjust_points(
  p_customer_id uuid,
  p_delta int,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_new_points int;
  v_admin_id uuid := auth.uid();
BEGIN
  IF NOT fn_is_admin() THEN
    RAISE EXCEPTION 'E_FORBIDDEN: Only admin can manually adjust points' USING ERRCODE = 'P0001';
  END IF;

  IF length(trim(COALESCE(p_reason, ''))) < 4 THEN
    RAISE EXCEPTION 'E_VALIDATION: A valid reason (min 4 characters) is required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Customer not found' USING ERRCODE = 'P0001';
  END IF;

  v_new_points := greatest(0, v_customer.loyalty_points + p_delta);

  UPDATE customers
  SET loyalty_points = v_new_points
  WHERE id = p_customer_id;

  INSERT INTO loyalty_ledger (
    customer_id,
    delta,
    reason,
    created_by
  )
  VALUES (
    p_customer_id,
    p_delta,
    trim(p_reason),
    v_admin_id
  );

  INSERT INTO audit_log (branch_id, actor_id, action, entity, entity_id, before, after)
  VALUES (
    v_customer.branch_id,
    v_admin_id,
    'points_adjusted',
    'customers',
    p_customer_id,
    jsonb_build_object('loyalty_points', v_customer.loyalty_points),
    jsonb_build_object('loyalty_points', v_new_points, 'delta', p_delta, 'reason', trim(p_reason))
  );

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'loyalty_points', v_new_points,
    'delta', p_delta
  );
END;
$$;
