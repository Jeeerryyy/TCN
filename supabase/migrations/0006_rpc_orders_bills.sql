-- ============================================================================
-- Migration: 0006_rpc_orders_bills.sql
-- Description: RPCs for Cafe Orders, Bill Preview, Payments, Finalization, and Void
-- ============================================================================

-- 1. Add order items to an active session
CREATE OR REPLACE FUNCTION rpc_add_order_items(
  p_op_id TEXT,
  p_session_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch_id UUID;
  v_session RECORD;
  v_order_id UUID;
  v_item JSONB;
  v_menu_item RECORD;
  v_cafe_subtotal BIGINT := 0;
BEGIN
  -- Idempotency check
  IF p_op_id IS NOT NULL AND EXISTS (SELECT 1 FROM op_log WHERE op_id = p_op_id) THEN
    SELECT response INTO v_item FROM op_log WHERE op_id = p_op_id;
    RETURN v_item;
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  v_branch_id := v_session.branch_id;

  -- Find or create open order for this session
  SELECT id INTO v_order_id FROM orders WHERE session_id = p_session_id AND status = 'open' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (branch_id, session_id, customer_id, created_by, status)
    VALUES (v_branch_id, p_session_id, v_session.customer_id, auth.uid(), 'open')
    RETURNING id INTO v_order_id;
  END IF;

  -- Insert/update items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_menu_item FROM menu_items WHERE id = (v_item->>'menu_item_id')::UUID;
    IF FOUND THEN
      INSERT INTO order_items (order_id, menu_item_id, name_snapshot, price_snapshot, qty)
      VALUES (
        v_order_id,
        v_menu_item.id,
        v_menu_item.name,
        v_menu_item.price,
        (v_item->>'qty')::INT
      )
      ON CONFLICT (order_id, menu_item_id)
      DO UPDATE SET qty = order_items.qty + EXCLUDED.qty;
    END IF;
  END LOOP;

  -- Calculate order subtotal
  SELECT COALESCE(SUM(price_snapshot * qty), 0) INTO v_cafe_subtotal
  FROM order_items WHERE order_id = v_order_id;

  INSERT INTO op_log (op_id, response)
  VALUES (
    p_op_id,
    jsonb_build_object('order_id', v_order_id, 'cafe_subtotal', v_cafe_subtotal)
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'cafe_subtotal', v_cafe_subtotal);
END;
$$;


-- 2. Update order item quantity
CREATE OR REPLACE FUNCTION rpc_update_order_item(
  p_op_id TEXT,
  p_item_id UUID,
  p_qty INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res JSONB;
BEGIN
  IF p_op_id IS NOT NULL AND EXISTS (SELECT 1 FROM op_log WHERE op_id = p_op_id) THEN
    SELECT response INTO v_res FROM op_log WHERE op_id = p_op_id;
    RETURN v_res;
  END IF;

  IF p_qty <= 0 THEN
    DELETE FROM order_items WHERE id = p_item_id;
  ELSE
    UPDATE order_items SET qty = p_qty WHERE id = p_item_id;
  END IF;

  v_res := jsonb_build_object('success', true, 'item_id', p_item_id, 'qty', p_qty);

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, response) VALUES (p_op_id, v_res);
  END IF;

  RETURN v_res;
END;
$$;


-- 3. Create standalone cafe order & draft bill
CREATE OR REPLACE FUNCTION rpc_create_standalone_order(
  p_op_id TEXT,
  p_items JSONB,
  p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_branch_id UUID;
  v_order_id UUID;
  v_bill_id UUID;
  v_item JSONB;
  v_menu_item RECORD;
  v_cafe_total BIGINT := 0;
  v_res JSONB;
BEGIN
  IF p_op_id IS NOT NULL AND EXISTS (SELECT 1 FROM op_log WHERE op_id = p_op_id) THEN
    SELECT response INTO v_res FROM op_log WHERE op_id = p_op_id;
    RETURN v_res;
  END IF;

  v_branch_id := fn_branch_id();

  INSERT INTO orders (branch_id, session_id, customer_id, created_by, status)
  VALUES (v_branch_id, NULL, p_customer_id, auth.uid(), 'open')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_menu_item FROM menu_items WHERE id = (v_item->>'menu_item_id')::UUID;
    IF FOUND THEN
      INSERT INTO order_items (order_id, menu_item_id, name_snapshot, price_snapshot, qty)
      VALUES (
        v_order_id,
        v_menu_item.id,
        v_menu_item.name,
        v_menu_item.price,
        (v_item->>'qty')::INT
      );
      v_cafe_total := v_cafe_total + (v_menu_item.price * (v_item->>'qty')::INT);
    END IF;
  END LOOP;

  INSERT INTO bills (
    branch_id,
    kind,
    session_id,
    order_id,
    customer_id,
    status,
    table_charge,
    cafe_total,
    total,
    created_by
  )
  VALUES (
    v_branch_id,
    'standalone',
    NULL,
    v_order_id,
    p_customer_id,
    'draft',
    0,
    v_cafe_total,
    v_cafe_total,
    auth.uid()
  )
  RETURNING id INTO v_bill_id;

  v_res := jsonb_build_object(
    'order_id', v_order_id,
    'bill_id', v_bill_id,
    'cafe_total', v_cafe_total
  );

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, response) VALUES (p_op_id, v_res);
  END IF;

  RETURN v_res;
END;
$$;


-- 4. Calculate live bill preview
CREATE OR REPLACE FUNCTION rpc_calc_bill_preview(
  p_bill_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill RECORD;
  v_session RECORD;
  v_charge_json JSONB;
  v_cafe_total BIGINT := 0;
  v_net_total BIGINT := 0;
BEGIN
  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill.session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM sessions WHERE id = v_bill.session_id;
    -- Recompute table charges
    v_charge_json := fn_compute_table_charge(v_session.id);
    v_bill.table_charge := (v_charge_json->>'total_charge')::BIGINT;
    v_bill.table_breakdown := v_charge_json->'breakdown';

    -- Cafe items attached
    SELECT COALESCE(SUM(oi.price_snapshot * oi.qty), 0) INTO v_cafe_total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.session_id = v_session.id;

    v_bill.cafe_total := v_cafe_total;
  END IF;

  v_net_total := (v_bill.table_charge + v_bill.cafe_total) - COALESCE(v_bill.discount_amount, 0) - COALESCE(v_bill.loyalty_redeemed, 0) - COALESCE(v_bill.deposit_applied, 0);
  IF v_net_total < 0 THEN v_net_total := 0; END IF;

  UPDATE bills
  SET
    table_charge = v_bill.table_charge,
    table_breakdown = v_bill.table_breakdown,
    cafe_total = v_bill.cafe_total,
    total = v_net_total
  WHERE id = p_bill_id;

  RETURN jsonb_build_object(
    'bill', row_to_json(v_bill),
    'net_total', v_net_total
  );
END;
$$;


-- 5. Finalize Bill (Record payments, check exact total, mark paid)
CREATE OR REPLACE FUNCTION rpc_finalize_bill(
  p_op_id TEXT,
  p_bill_id UUID,
  p_payments JSONB,
  p_redeem_points INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill RECORD;
  v_pay JSONB;
  v_total_paid BIGINT := 0;
  v_points_discount BIGINT := 0;
  v_res JSONB;
BEGIN
  IF p_op_id IS NOT NULL AND EXISTS (SELECT 1 FROM op_log WHERE op_id = p_op_id) THEN
    SELECT response INTO v_res FROM op_log WHERE op_id = p_op_id;
    RETURN v_res;
  END IF;

  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill.status = 'paid' THEN
    RAISE EXCEPTION 'Bill is already paid';
  END IF;

  -- Handle loyalty point redemption (ASSUMPTION: 100 points = ₹10 = 1000 paise)
  IF p_redeem_points > 0 AND v_bill.customer_id IS NOT NULL THEN
    v_points_discount := (p_redeem_points / 10) * 100; -- 10 paise per point
    UPDATE customers
    SET loyalty_points = loyalty_points - p_redeem_points
    WHERE id = v_bill.customer_id AND loyalty_points >= p_redeem_points;

    UPDATE bills SET loyalty_redeemed = v_points_discount WHERE id = p_bill_id;
    v_bill.total := GREATEST(0, v_bill.total - v_points_discount);
  END IF;

  -- Record payment rows
  FOR v_pay IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO bill_payments (
      bill_id,
      mode,
      amount,
      payer_label,
      created_by
    )
    VALUES (
      p_bill_id,
      (v_pay->>'mode')::pay_mode,
      (v_pay->>'amount')::BIGINT,
      v_pay->>'payer_label',
      auth.uid()
    );

    v_total_paid := v_total_paid + (v_pay->>'amount')::BIGINT;
  END LOOP;

  -- Check if total paid matches bill total
  IF v_total_paid < v_bill.total THEN
    RAISE EXCEPTION 'Payment sum (% paise) is less than bill total (% paise)', v_total_paid, v_bill.total;
  END IF;

  -- Mark bill as paid
  UPDATE bills
  SET
    status = 'paid',
    paid_at = now()
  WHERE id = p_bill_id;

  -- Close order if any
  IF v_bill.order_id IS NOT NULL THEN
    UPDATE orders SET status = 'closed' WHERE id = v_bill.order_id;
  END IF;

  v_res := jsonb_build_object(
    'success', true,
    'bill_id', p_bill_id,
    'total_paid', v_total_paid
  );

  IF p_op_id IS NOT NULL THEN
    INSERT INTO op_log (op_id, response) VALUES (p_op_id, v_res);
  END IF;

  RETURN v_res;
END;
$$;


-- 6. Void bill (Admin only)
CREATE OR REPLACE FUNCTION rpc_void_bill(
  p_bill_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill RECORD;
BEGIN
  -- Security check: only admin can void bills
  IF NOT fn_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can void bills';
  END IF;

  SELECT * INTO v_bill FROM bills WHERE id = p_bill_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  UPDATE bills
  SET
    status = 'void',
    void_reason = p_reason
  WHERE id = p_bill_id;

  RETURN jsonb_build_object('success', true, 'bill_id', p_bill_id, 'status', 'void');
END;
$$;
