-- ============================================================================
-- Migration: 0010_rls.sql
-- Description: Strict Row-Level Security (RLS) policies per TRD Section 7
-- Non-Negotiable Rule: Staff must NEVER be able to read revenue, expenses,
--                      audit, settings, or call report RPCs.
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. BRANCHES
-- ----------------------------------------------------------------------------
CREATE POLICY "branches_read" ON branches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "branches_admin_write" ON branches
  FOR ALL TO authenticated USING (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 3. PROFILES
-- ----------------------------------------------------------------------------
CREATE POLICY "profiles_read_own_or_admin" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR fn_is_admin());

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL TO authenticated
  USING (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 4. GAME TABLES
-- ----------------------------------------------------------------------------
CREATE POLICY "game_tables_read" ON game_tables
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "game_tables_admin_write" ON game_tables
  FOR ALL TO authenticated USING (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 5. RATE RULES
-- ----------------------------------------------------------------------------
CREATE POLICY "rate_rules_read" ON rate_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rate_rules_admin_write" ON rate_rules
  FOR ALL TO authenticated USING (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 6. CUSTOMERS & LOYALTY
-- ----------------------------------------------------------------------------
CREATE POLICY "customers_read_write" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "membership_plans_read" ON membership_plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "membership_plans_admin_write" ON membership_plans
  FOR ALL TO authenticated USING (fn_is_admin());

CREATE POLICY "customer_memberships_read_write" ON customer_memberships
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "loyalty_ledger_read_write" ON loyalty_ledger
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 7. SESSIONS, SEGMENTS, PAUSES
-- ----------------------------------------------------------------------------
CREATE POLICY "sessions_read_write" ON sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "session_segments_read_write" ON session_segments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "session_pauses_read_write" ON session_pauses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 8. BOOKINGS
-- ----------------------------------------------------------------------------
CREATE POLICY "bookings_read_write_auth" ON bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bookings_anon_read_availability" ON bookings
  FOR SELECT TO anon
  USING (status IN ('confirmed', 'checked_in', 'pending_verification'));

CREATE POLICY "bookings_anon_insert" ON bookings
  FOR INSERT TO anon
  WITH CHECK (source = 'online' AND status = 'pending_deposit');

-- ----------------------------------------------------------------------------
-- 9. MENU & ORDERS
-- ----------------------------------------------------------------------------
CREATE POLICY "menu_categories_read" ON menu_categories
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "menu_categories_admin_write" ON menu_categories
  FOR ALL TO authenticated USING (fn_is_admin());

CREATE POLICY "menu_items_read" ON menu_items
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "menu_items_admin_write" ON menu_items
  FOR ALL TO authenticated USING (fn_is_admin());

CREATE POLICY "orders_read_write" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "order_items_read_write" ON order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 10. BILLS & PAYMENTS & DISCOUNTS
-- ----------------------------------------------------------------------------
CREATE POLICY "bills_read_write" ON bills
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bill_payments_read_write" ON bill_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "discount_requests_read_write" ON discount_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 11. EXPENSES (STRICT ADMIN ONLY)
-- Staff role MUST NEVER be able to read or modify expenses
-- ----------------------------------------------------------------------------
CREATE POLICY "expenses_admin_only" ON expenses
  FOR ALL TO authenticated
  USING (fn_is_admin())
  WITH CHECK (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 12. ATTENDANCE
-- Staff can read their own attendance, admin can read/edit all
-- ----------------------------------------------------------------------------
CREATE POLICY "attendance_read" ON attendance
  FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR fn_is_admin());

CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid() OR fn_is_admin());

CREATE POLICY "attendance_admin_write" ON attendance
  FOR UPDATE TO authenticated
  USING (fn_is_admin())
  WITH CHECK (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 13. ALERTS
-- ----------------------------------------------------------------------------
CREATE POLICY "alerts_read_write" ON alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 14. SETTINGS (STRICT ADMIN ONLY)
-- Staff role MUST NEVER be able to read or modify settings
-- ----------------------------------------------------------------------------
CREATE POLICY "settings_admin_only" ON settings
  FOR ALL TO authenticated
  USING (fn_is_admin())
  WITH CHECK (fn_is_admin());

-- ----------------------------------------------------------------------------
-- 15. AUDIT LOG (STRICT ADMIN ONLY READ, IMMUTABLE)
-- Staff cannot read audit; no updates or deletes allowed for anyone
-- ----------------------------------------------------------------------------
CREATE POLICY "audit_log_admin_read" ON audit_log
  FOR SELECT TO authenticated
  USING (fn_is_admin());

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 16. OP LOG & PIN ATTEMPTS
-- ----------------------------------------------------------------------------
CREATE POLICY "op_log_read_write" ON op_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "pin_attempts_read_write" ON pin_attempts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
