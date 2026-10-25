-- 0013_payments_schema.sql
-- Payments Architecture: payments, payment_events, refunds tables and enums

-- 1. Extend enums
ALTER TYPE pay_mode ADD VALUE IF NOT EXISTS 'online';

DO $$ BEGIN
  ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'payment_late_refund_due';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_purpose AS ENUM ('booking', 'bill', 'membership');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'created',
    'pending',
    'authorized',
    'captured',
    'failed',
    'refund_pending',
    'partially_refunded',
    'refunded',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  purpose payment_purpose NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider TEXT NOT NULL, -- 'manual_upi' | 'mock_gateway' | 'razorpay'
  provider_order_id TEXT NOT NULL,
  provider_payment_id TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'created',
  method TEXT, -- 'upi' | 'card' | 'netbanking' | 'wallet'
  failure_reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create payment_events table (raw webhooks & replay idempotency)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  provider_refund_id TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'succeeded' | 'failed'
  reason TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order ON payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event ON payment_events(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);
