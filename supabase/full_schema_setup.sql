-- ====================================================================
-- THE CUE NATION (TCN) - COMPLETE PRODUCTION DATABASE SETUP
-- Target Project ID: ruzdhrnltaftxtkgymtk
-- Target Supabase URL: https://ruzdhrnltaftxtkgymtk.supabase.co
-- ====================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/ruzdhrnltaftxtkgymtk
-- 2. Click "SQL Editor" on the left navigation bar.
-- 3. Click "New Query", paste this entire script, and click "Run".
-- ====================================================================

-- 1. Enable standard extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. GAME TABLES TABLE (Venue Floor Management)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.game_tables (
  id text PRIMARY KEY,
  name text NOT NULL,
  short_code text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  rate_per_hour numeric(10,2) NOT NULL DEFAULT 240,
  min_minutes numeric DEFAULT 60,
  size text,
  cloth_color text,
  current_session_id text,
  location_zone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all extended columns exist even if game_tables was created with an older schema
ALTER TABLE public.game_tables ADD COLUMN IF NOT EXISTS short_code text;
ALTER TABLE public.game_tables ADD COLUMN IF NOT EXISTS min_minutes numeric DEFAULT 60;
ALTER TABLE public.game_tables ADD COLUMN IF NOT EXISTS current_session_id text;
ALTER TABLE public.game_tables ADD COLUMN IF NOT EXISTS location_zone text;

-- Seed the venue's complete 6 cue tables (Pool 1-3 & Snooker 1-3)
INSERT INTO public.game_tables (id, name, short_code, type, status, rate_per_hour, min_minutes, size, cloth_color, location_zone)
VALUES 
  ('tbl_p1', 'Pool Table 1', 'P1', 'pool', 'available', 180, 60, '8 ft English Pool', 'Tournament Green', 'Main Hall'),
  ('tbl_p2', 'Pool Table 2', 'P2', 'pool', 'available', 180, 60, '8 ft English Pool', 'Tournament Green', 'Main Hall'),
  ('tbl_p3', 'Pool Table 3', 'P3', 'pool', 'available', 180, 60, '8 ft English Pool', 'Tournament Green', 'VIP Arena'),
  ('tbl_s1', 'Snooker Table 1', 'S1', 'snooker', 'available', 300, 60, '12 ft Championship Riley', 'Strachan 6811 English Green', 'Snooker Hall'),
  ('tbl_s2', 'Snooker Table 2', 'S2', 'snooker', 'available', 300, 60, '12 ft Tournament Wiraka', 'Strachan 6811 English Green', 'Snooker Hall'),
  ('tbl_s3', 'Snooker Table 3', 'S3', 'snooker', 'available', 300, 60, '12 ft Tournament Riley', 'Strachan 6811 English Green', 'Snooker Hall')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  size = EXCLUDED.size,
  cloth_color = EXCLUDED.cloth_color;

-- ====================================================================
-- 3. GAME SESSIONS TABLE (Live Session Timers & Players)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id text PRIMARY KEY,
  table_id text REFERENCES public.game_tables(id) ON DELETE SET NULL,
  table_name text,
  table_type text,
  rate_per_hour numeric(10,2),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  paused_at timestamptz,
  total_paused_duration_ms numeric DEFAULT 0,
  customer_name text,
  customer_phone text,
  customer_id text,
  players_count int DEFAULT 1,
  player_names text[] DEFAULT '{}'::text[],
  status text DEFAULT 'active',
  notes text,
  linked_cafe_order_ids text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- 4. CUSTOMERS TABLE (Sanitized & Clean CRM)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  tier text DEFAULT 'standard',
  wallet_balance numeric(10,2) DEFAULT 0,
  total_visits int DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  preferred_game text DEFAULT 'both',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- ====================================================================
-- 5. BOOKINGS & RESERVATIONS TABLE (Sanitized & Clean Schedule)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  table_id text REFERENCES public.game_tables(id) ON DELETE SET NULL,
  table_name text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  booking_date text NOT NULL,
  start_time text NOT NULL,
  duration_minutes numeric DEFAULT 60,
  advance_deposit numeric(10,2) DEFAULT 0,
  players_count int DEFAULT 1,
  status text DEFAULT 'confirmed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);

-- ====================================================================
-- 6. BILLS & INVOICES TABLE (POS Settlements & Split Invoices)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id text PRIMARY KEY,
  invoice_number text,
  session_id text,
  table_id text,
  table_name text,
  customer_name text,
  customer_phone text,
  items jsonb DEFAULT '[]'::jsonb,
  table_charge numeric(10,2) DEFAULT 0,
  cafe_charge numeric(10,2) DEFAULT 0,
  subtotal numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  discount_reason text,
  tax_gst_amount numeric(10,2) DEFAULT 0,
  final_total numeric(10,2) DEFAULT 0,
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'settled',
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  settled_by text
);

-- ====================================================================
-- 7. CAFE ORDERS TABLE (Live KOT & Orders)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  order_number text,
  destination text,
  table_id text,
  table_name text,
  customer_name text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending',
  is_billed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- 8. MENU ITEMS TABLE (Cafe Catalog)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'beverages',
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  is_vegetarian boolean DEFAULT true,
  is_available boolean DEFAULT true,
  prep_time_minutes numeric DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the 6 official drinks
INSERT INTO public.menu_items (id, name, category, price, description, is_vegetarian, is_available, prep_time_minutes)
VALUES
  ('m_fanta', 'Fanta', 'beverages', 40, 'Chilled sparkling orange flavoured drink', true, true, 1),
  ('m_redbull', 'Redbull', 'beverages', 125, 'Chilled energy drink (250ml can)', true, true, 1),
  ('m_amul_cool', 'Amul Cool', 'beverages', 60, 'Chilled flavoured milk bottle', true, true, 1),
  ('m_hell', 'Hell', 'beverages', 60, 'Classic energy drink (250ml can)', true, true, 1),
  ('m_cola', 'Cola', 'beverages', 50, 'Chilled refreshing fizzy cola', true, true, 1),
  ('m_mineral_water', 'Mineral Water', 'beverages', 10, 'Packaged chilled drinking water (500ml/1L)', true, true, 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  is_vegetarian = EXCLUDED.is_vegetarian,
  is_available = EXCLUDED.is_available,
  prep_time_minutes = EXCLUDED.prep_time_minutes;

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) & MULTI-DEVICE ACCESS POLICIES
-- ====================================================================
ALTER TABLE public.game_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Allow public and authenticated users full realtime access
DROP POLICY IF EXISTS "Public full access game_tables" ON public.game_tables;
CREATE POLICY "Public full access game_tables" ON public.game_tables FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access game_sessions" ON public.game_sessions;
CREATE POLICY "Public full access game_sessions" ON public.game_sessions FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access customers" ON public.customers;
CREATE POLICY "Public full access customers" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access bookings" ON public.bookings;
CREATE POLICY "Public full access bookings" ON public.bookings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access bills" ON public.bills;
CREATE POLICY "Public full access bills" ON public.bills FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access orders" ON public.orders;
CREATE POLICY "Public full access orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access menu_items" ON public.menu_items;
CREATE POLICY "Public full access menu_items" ON public.menu_items FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable Realtime for dynamic live synchronization between Staff and Admin (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_tables, public.game_sessions, public.bookings, public.bills, public.customers, public.orders, public.menu_items;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;

