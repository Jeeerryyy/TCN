-- 0003_ops_tables.sql
-- TCN Technical Requirements Document (TRD) Section 6.2 and Section 13.3

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES game_tables(id) ON DELETE RESTRICT,
  customer_id uuid NULL REFERENCES customers(id) ON DELETE SET NULL,
  booking_id uuid NULL, -- will reference bookings(id)
  players int NOT NULL DEFAULT 1 CHECK (players >= 1 AND players <= 12),
  status session_status NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  created_by uuid NULL,
  op_id uuid UNIQUE NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES game_tables(id) ON DELETE RESTRICT,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  customer_id uuid NULL REFERENCES customers(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  table_type table_type NOT NULL,
  table_id uuid NULL REFERENCES game_tables(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  source booking_source NOT NULL DEFAULT 'walk_in',
  status booking_status NOT NULL DEFAULT 'pending_deposit',
  deposit_amount numeric(10,2) NOT NULL DEFAULT 0,
  deposit_status deposit_status NOT NULL DEFAULT 'none',
  deposit_method pay_mode NULL,
  utr text NULL,
  verified_by uuid NULL,
  hold_until timestamptz NULL,
  cancel_reason text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_booking_dates CHECK (end_at > start_at),
  CONSTRAINT exclude_booking_table_overlap EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (
    table_id IS NOT NULL AND status IN (
      'pending_deposit',
      'pending_verification',
      'confirmed',
      'checked_in'
    )
  )
);

ALTER TABLE sessions ADD CONSTRAINT fk_sessions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  available boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_id uuid NULL REFERENCES sessions(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES customers(id) ON DELETE SET NULL,
  created_by uuid NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  name_snapshot text NOT NULL,
  price_snapshot numeric(10,2) NOT NULL,
  qty int NOT NULL CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS bill_no_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  bill_no int NOT NULL DEFAULT nextval('bill_no_seq'),
  kind bill_kind NOT NULL DEFAULT 'session',
  session_id uuid NULL REFERENCES sessions(id) ON DELETE SET NULL,
  order_id uuid NULL REFERENCES orders(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES customers(id) ON DELETE SET NULL,
  status bill_status NOT NULL DEFAULT 'draft',
  table_charge numeric(10,2) NOT NULL DEFAULT 0,
  table_breakdown jsonb NULL,
  cafe_total numeric(10,2) NOT NULL DEFAULT 0,
  discount_type discount_type NULL,
  discount_value numeric(10,2) NULL,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_reason text NULL,
  discount_approved_by uuid NULL,
  loyalty_redeemed numeric(10,2) NOT NULL DEFAULT 0,
  deposit_applied numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz NULL,
  void_reason text NULL
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  mode pay_mode NOT NULL,
  amount numeric(10,2) NOT NULL, -- negative represents cash refund out
  payer_label text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discount_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  type discount_type NOT NULL,
  value numeric(10,2) NOT NULL,
  reason text NOT NULL,
  status discount_req_status NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  decided_by uuid NULL,
  decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  spent_on date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL,
  amount numeric(10,2) NOT NULL,
  note text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz NULL,
  edited_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  ref_id uuid NOT NULL,
  message text NOT NULL,
  audience user_role[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  acked_by uuid NULL,
  acked_at timestamptz NULL,
  resolved_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alerts_active_ref ON alerts(type, ref_id) WHERE (resolved_at IS NULL);

CREATE TABLE IF NOT EXISTS settings (
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, key)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  actor_id uuid NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NULL,
  before jsonb NULL,
  after jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS op_log (
  op_id uuid PRIMARY KEY,
  user_id uuid NULL,
  rpc text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pin_attempts (
  key text PRIMARY KEY,
  fails int NOT NULL DEFAULT 0,
  locked_until timestamptz NULL
);

-- Operational indexes per TRD 6.2
CREATE INDEX IF NOT EXISTS idx_sessions_active_table ON sessions(table_id) WHERE (status <> 'completed');
CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_bills_status_created ON bills(status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
