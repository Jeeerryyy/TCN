-- 0014_customer_accounts.sql
-- Real Customer Accounts: role extension, customer linking, trigger on auth.users

-- 1. Extend user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';

-- 2. Create customer_link_status enum
DO $$ BEGIN
  CREATE TYPE customer_link_status AS ENUM ('unlinked', 'pending_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add columns to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_status customer_link_status NOT NULL DEFAULT 'unlinked',
  ADD COLUMN IF NOT EXISTS link_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_link_status ON customers(link_status);

-- 4. DB Trigger on auth.users for customer signup
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'customer';
  v_customer_id UUID;
  v_points_count INT := 0;
  v_membership_count INT := 0;
  v_bills_count INT := 0;
  v_phone TEXT;
  v_branch_id UUID := '00000000-0000-0000-0000-000000000001';
  v_name TEXT;
BEGIN
  -- Security Invariant: reject reserved domains or reserved admin emails on customer signups
  IF NEW.email LIKE '%@tcn.local' THEN
    RAISE EXCEPTION 'Registration with @tcn.local domain is forbidden.';
  END IF;

  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Insert profile with STRICT customer role (client can never elevate role)
  INSERT INTO profiles (id, branch_id, role, name, username, email, active)
  VALUES (
    NEW.id,
    v_branch_id,
    v_role,
    v_name,
    split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6),
    NEW.email,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

  -- Phone-claim hardening: check if an unlinked customer row exists with this phone
  v_phone := NEW.raw_user_meta_data->>'phone';
  IF v_phone IS NOT NULL AND v_phone ~ '^[6-9]\d{9}$' THEN
    SELECT id, points INTO v_customer_id, v_points_count
    FROM customers
    WHERE phone = v_phone AND user_id IS NULL
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      -- Check historical activity
      SELECT count(*) INTO v_membership_count FROM customer_memberships WHERE customer_id = v_customer_id;
      SELECT count(*) INTO v_bills_count FROM bills WHERE customer_id = v_customer_id;

      IF v_points_count > 0 OR v_membership_count > 0 OR v_bills_count > 0 THEN
        -- High-value history requires admin review to prevent data leakage
        UPDATE customers
        SET
          user_id = NEW.id,
          link_status = 'pending_review',
          link_notes = 'Phone match with points/membership/bill history. Awaiting admin review.'
        WHERE id = v_customer_id;
      ELSE
        -- No historical assets: auto-link
        UPDATE customers
        SET
          user_id = NEW.id,
          link_status = 'approved',
          link_notes = 'Auto-linked on signup (no prior assets).'
        WHERE id = v_customer_id;
      END IF;
    ELSE
      -- No existing row: create new approved customer record
      INSERT INTO customers (branch_id, name, phone, user_id, link_status)
      VALUES (
        v_branch_id,
        v_name,
        v_phone,
        NEW.id,
        'approved'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users if not already attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();
