-- supabase/seed.sql
-- Seed data for TCN - The Cue Nation (TRD Section 13.9)

-- 1. Default Branch
INSERT INTO branches (id, name, timezone)
VALUES ('00000000-0000-0000-0000-000000000001', 'TCN - The Cue Nation Main', 'Asia/Kolkata')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Six Game Tables (3 Pool, 3 Snooker)
INSERT INTO game_tables (id, branch_id, name, type, status, active, sort)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Pool 1', 'pool', 'free', true, 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Pool 2', 'pool', 'free', true, 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Pool 3', 'pool', 'free', true, 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Snooker 1', 'snooker', 'free', true, 4),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Snooker 2', 'snooker', 'free', true, 5),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'Snooker 3', 'snooker', 'free', true, 6)
ON CONFLICT (id) DO NOTHING;

-- 3. Default Catch-All Rate Rules (Pool Rs 240/hr, Snooker Rs 300/hr)
INSERT INTO rate_rules (id, branch_id, table_type, day_type, customer_type, start_time, end_time, rate_per_hour, priority, active)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pool', 'any', 'any', '00:00:00', '23:59:59', 240.00, 0, true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'snooker', 'any', 'any', '00:00:00', '23:59:59', 300.00, 0, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Menu Categories & Items
INSERT INTO menu_categories (id, branch_id, name, sort)
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Drinks', 1),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Snacks', 2),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Meals', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, branch_id, category_id, name, price, available, sort)
VALUES
  ('31000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Cold Coffee', 60.00, true, 1),
  ('31000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Iced Tea', 50.00, true, 2),
  ('31000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Mineral Water', 20.00, true, 3),
  ('31000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'French Fries', 90.00, true, 1),
  ('31000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Cheese Garlic Bread', 110.00, true, 2),
  ('31000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Veg Club Sandwich', 130.00, true, 1),
  ('31000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Paneer Tikka Pizza', 220.00, true, 2)
ON CONFLICT (id) DO NOTHING;

-- 5. Membership Plans
INSERT INTO membership_plans (id, branch_id, name, price, duration_days, active)
VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Silver Monthly', 999.00, 30, true),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Gold Quarterly', 2499.00, 90, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Settings Defaults (PRD Section 3 Assumptions AS-1 to AS-11)
INSERT INTO settings (branch_id, key, value)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'billing', '{"billing.block_minutes": 15, "billing.min_minutes": 60, "billing.extra_player_fee": 0}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'deposit', '{"deposit.amount": 100, "deposit.refund_hours": 2}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'loyalty', '{"loyalty.earn_per_rs": 10, "loyalty.point_value": 1, "loyalty.max_redeem_pct": 50}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'business', '{"business.name": "TCN – The Cue Nation", "business.weekend_days": [0, 6], "business.timezone": "Asia/Kolkata"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'booking', '{"booking.slot_minutes": 60, "booking.hold_minutes": 30}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'alerts', '{"alerts.idle_free_min": 60, "alerts.paused_min": 15, "alerts.ending_min": 10}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 'upi', '{"upi.vpa": "thecuenation@upi", "upi.payee_name": "TCN"}'::jsonb)
ON CONFLICT (branch_id, key) DO UPDATE SET value = EXCLUDED.value;

-- 7. Admin and Staff Seed Profiles
-- Matches TCN standard: 1 Admin (PIN: 8888) and 1 Staff (PIN: 1234)
INSERT INTO profiles (id, branch_id, role, name, username, email, active, approval_pin_hash)
VALUES
  (
    '90000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'Administrator',
    'admin',
    'admin@tcn.local',
    true,
    crypt('8888', gen_salt('bf'))
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'staff',
    'Floor Staff',
    'staff',
    'staff@tcn.local',
    true,
    crypt('1234', gen_salt('bf'))
  )
ON CONFLICT (id) DO NOTHING;

