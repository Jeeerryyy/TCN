-- 0017_security_hardening_rls.sql
-- Security Hardening: Customer Role Isolation, Admin Claim Hardening, RLS Audit

-- 1. Helper functions
CREATE OR REPLACE FUNCTION fn_is_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff') AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION fn_is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'customer' AND active = true
  );
$$;

-- 2. Hardened rpc_claim_profile
CREATE OR REPLACE FUNCTION rpc_claim_profile()
RETURNS profiles AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_provider TEXT;
  v_email_verified BOOLEAN;
  v_profile profiles;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  BEGIN
    v_email := auth.jwt() ->> 'email';
    v_provider := auth.jwt() -> 'app_metadata' ->> 'provider';
    v_email_verified := COALESCE((auth.jwt() ->> 'email_verified')::boolean, false);
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
    v_provider := NULL;
    v_email_verified := false;
  END;

  -- Admin claim hardening: ONLY Google-provider AND verified email can claim pre-seeded admin profile
  IF v_provider <> 'google' OR NOT v_email_verified THEN
    RAISE EXCEPTION 'Admin profile can only be claimed via verified Google account.';
  END IF;

  SELECT * INTO v_profile
  FROM profiles
  WHERE email = v_email AND role = 'admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pre-registered admin profile found for email %', v_email;
  END IF;

  -- Re-key if necessary
  IF v_profile.id <> v_uid THEN
    UPDATE profiles
    SET id = v_uid, updated_at = now()
    WHERE email = v_email AND role = 'admin'
    RETURNING * INTO v_profile;
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Customer Link Review RPC (Admin Only)
CREATE OR REPLACE FUNCTION rpc_review_customer_link(
  p_customer_id UUID,
  p_approve BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS customers AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_customer customers;
  v_new_status customer_link_status;
BEGIN
  IF NOT fn_is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admin can review customer link requests.';
  END IF;

  IF p_approve THEN
    v_new_status := 'approved';
  ELSE
    v_new_status := 'rejected';
  END IF;

  UPDATE customers
  SET
    link_status = v_new_status,
    link_notes = COALESCE(p_notes, 'Reviewed by admin'),
    updated_at = now()
  WHERE id = p_customer_id
  RETURNING * INTO v_customer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found with ID %', p_customer_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (branch_id, user_id, action, target_type, target_id, details)
  VALUES (
    v_customer.branch_id,
    v_caller_id,
    'customer_link_reviewed',
    'customer',
    p_customer_id,
    jsonb_build_object(
      'approved', p_approve,
      'status', v_new_status,
      'notes', p_notes
    )
  );

  RETURN v_customer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Overhauls for Customer Role Isolation

-- PROFILES
DROP POLICY IF EXISTS "profiles_read_own_or_admin" ON profiles;
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR fn_is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- SESSIONS, SEGMENTS, PAUSES: Staff or Admin ONLY
DROP POLICY IF EXISTS "sessions_read_write" ON sessions;
CREATE POLICY "sessions_staff_admin_all" ON sessions
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

DROP POLICY IF EXISTS "session_segments_read_write" ON session_segments;
CREATE POLICY "session_segments_staff_admin_all" ON session_segments
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

DROP POLICY IF EXISTS "session_pauses_read_write" ON session_pauses;
CREATE POLICY "session_pauses_staff_admin_all" ON session_pauses
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

-- ORDERS & ORDER ITEMS: Staff or Admin ONLY
DROP POLICY IF EXISTS "orders_read_write" ON orders;
CREATE POLICY "orders_staff_admin_all" ON orders
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

DROP POLICY IF EXISTS "order_items_read_write" ON order_items;
CREATE POLICY "order_items_staff_admin_all" ON order_items
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

-- BILLS & BILL PAYMENTS
DROP POLICY IF EXISTS "bills_read" ON bills;
CREATE POLICY "bills_select" ON bills
  FOR SELECT TO authenticated
  USING (
    fn_is_staff_or_admin() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bills_admin_staff_write" ON bills;
CREATE POLICY "bills_write" ON bills
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

DROP POLICY IF EXISTS "bill_payments_read_write" ON bill_payments;
CREATE POLICY "bill_payments_all" ON bill_payments
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

-- CUSTOMERS: Staff/Admin have full access; Customers read/update own
DROP POLICY IF EXISTS "customers_read_write" ON customers;
CREATE POLICY "customers_staff_admin_all" ON customers
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

CREATE POLICY "customers_own_select" ON customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "customers_own_update" ON customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CUSTOMER MEMBERSHIPS & LOYALTY LEDGER: Protected by link_status = 'approved'
DROP POLICY IF EXISTS "customer_memberships_read_write" ON customer_memberships;
CREATE POLICY "customer_memberships_staff_admin_all" ON customer_memberships
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

CREATE POLICY "customer_memberships_own_select" ON customer_memberships
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE user_id = auth.uid() AND link_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "loyalty_ledger_read_write" ON loyalty_ledger;
CREATE POLICY "loyalty_ledger_staff_admin_all" ON loyalty_ledger
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

CREATE POLICY "loyalty_ledger_own_select" ON loyalty_ledger
  FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE user_id = auth.uid() AND link_status = 'approved'
    )
  );

-- BOOKINGS: Customers read own bookings; Staff/Admin full access
DROP POLICY IF EXISTS "bookings_read_write" ON bookings;
CREATE POLICY "bookings_staff_admin_all" ON bookings
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

CREATE POLICY "bookings_customer_own_select" ON bookings
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- PAYMENTS, PAYMENT_EVENTS, REFUNDS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_staff_admin_all" ON payments
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

CREATE POLICY "payments_customer_own_select" ON payments
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "payment_events_admin_only" ON payment_events
  FOR ALL TO authenticated
  USING (fn_is_admin())
  WITH CHECK (fn_is_admin());

CREATE POLICY "refunds_staff_admin_all" ON refunds
  FOR ALL TO authenticated
  USING (fn_is_staff_or_admin())
  WITH CHECK (fn_is_staff_or_admin());

CREATE POLICY "refunds_customer_own_select" ON refunds
  FOR SELECT TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

-- AUTH_EVENTS: Admin read-only; Insert via SECURITY DEFINER rpc_log_auth_event only
CREATE POLICY "auth_events_admin_select" ON auth_events
  FOR SELECT TO authenticated
  USING (fn_is_admin());
