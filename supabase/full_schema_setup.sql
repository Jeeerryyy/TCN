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
-- 8. ROW LEVEL SECURITY (RLS) & MULTI-DEVICE ACCESS POLICIES
-- ====================================================================
ALTER TABLE public.game_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

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

-- Enable Realtime for dynamic live synchronization between Staff and Admin (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_tables, public.game_sessions, public.bookings, public.bills, public.customers, public.orders;
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;

