# TCN – The Cue Nation: Technical & Product Addendum
**Amendment: Payment-Gateway-Ready Architecture + Real Customer Accounts + Auth Activity Audit**

Version 1.0 · Overrides previous conflicting requirements (guest-only booking; "no payment gateway").
Companion docs: `TCN_PRD.md`, `TCN_TRD.md`, `TCN_DESIGN.md`.

---

## 1. Overview & Architecture Principles

This Addendum establishes three mission-critical subsystems:
1. **Payments Foundation**: Gateway-agnostic payment processing (`PaymentProvider` interface), active provider selection (`manual_upi`, `mock_gateway`, `razorpay`), idempotency, webhook processing with raw HMAC verification, automated refunds, and reconciliation.
2. **Real Customer Accounts**: Authenticated customer membership portal (Email/Password + Google OAuth), strict RLS separation preventing customer JWTs from accessing staff/admin tables or RPCs, hardened admin claim verification, and phone-number claim approval workflows.
3. **Auth Activity Audit**: Complete visibility into all authentication lifecycle events (`login`, `failed_login`, `logout`, `register`, `password_reset`, `google_login`) across all roles, with automated brute-force alerts and owner-accessible audit trails.

### Layer Model Compliance (L1 – L8)
All additions strictly respect the layer boundary:
- **L1 Page**: `src/pages/**` (Customer account pages, admin payments, security audit)
- **L2 Component**: `src/components/**` (Payment selectors, account dialogs, audit tables)
- **L3 Hook / Store**: `src/hooks/**` (`usePayments`, `useCustomerAuth`, `useAuthAudit`, etc.)
- **L4 Service**: `src/services/**` (`payments/**`, `customerAuth.ts`, `authAudit.ts`)
- **L5 RPC / Edge Functions**: `supabase/migrations/**`, `supabase/functions/**`
- **L6 Data**: Tables, RLS, DB triggers (`payments`, `payment_events`, `refunds`, `auth_events`)
- **L7 Realtime**: Realtime subscriptions for payment capture and booking confirmations
- **L8 Offline Queue**: Offline support for manual payment records where applicable

---

## 2. Part 1: Payment-Gateway-Ready Architecture

### 2.1 Domain Interface & Providers (`src/services/payments/`)

```typescript
export type PaymentPurpose = 'booking' | 'bill' | 'membership';
export type PaymentProviderType = 'manual_upi' | 'mock_gateway' | 'razorpay';
export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded'
  | 'expired';

export interface PaymentOrderRequest {
  branchId: string;
  purpose: PaymentPurpose;
  refId: string; // booking_id or bill_id
  amountPaise: number;
  currency: 'INR';
  customerId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  idempotencyKey: string;
}

export interface PaymentOrderResult {
  paymentId: string;
  provider: PaymentProviderType;
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
  clientPayload: Record<string, unknown>; // e.g. Razorpay options or mock checkout URL
}

export interface NormalizedPaymentEvent {
  provider: PaymentProviderType;
  providerEventId: string;
  type: 'payment.captured' | 'payment.failed' | 'refund.processed';
  providerPaymentId?: string;
  providerOrderId?: string;
  amountPaise?: number;
  status: PaymentStatus;
  failureReason?: string;
  rawPayload: Record<string, unknown>;
}

export interface RefundRequest {
  paymentId: string;
  amountPaise: number;
  reason: string;
  requestedBy: string; // admin user ID
}

export interface RefundResult {
  refundId: string;
  providerRefundId: string;
  amountPaise: number;
  status: 'succeeded' | 'pending' | 'failed';
}

export interface PaymentProvider {
  type: PaymentProviderType;
  createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult>;
  verifyPayment(payload: Record<string, unknown>): Promise<boolean>;
  handleWebhook(rawBody: string, signature: string): Promise<NormalizedPaymentEvent>;
  refund(req: RefundRequest): Promise<RefundResult>;
  fetchStatus(providerOrderId: string): Promise<{ status: PaymentStatus; providerPaymentId?: string }>;
}
```

#### Provider Implementations:
1. **`manual_upi` (Default Active)**:
   - Preserves venue UPI QR code generation (`thecuenation@okaxis`) + customer UTR submission.
   - Creates a pending payment record; staff/admin manual verification marks status `captured`.
2. **`mock_gateway` (Test/Automated E2E)**:
   - Hosted modal / simulator at `/payments/mock-checkout`.
   - Simulates success, failure, network delay, duplicate webhook, late webhook post-expiry, and instant refund.
   - Signs simulated webhook payloads with real HMAC-SHA256 using a test secret.
3. **`razorpay` (Production-Ready)**:
   - Integrates official Razorpay Orders API (`POST /v1/orders`), Standard Checkout payload generation, and HMAC-SHA256 signature verification (`crypto.subtle` / Node crypto).
   - Handles webhooks: `payment.captured`, `payment.failed`, `refund.processed`.
   - API keys loaded strictly from server-side environment variables / Edge Function secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`). Browser never receives the secret.

### 2.2 Active Provider Settings
Stored in `settings` table:
- `payments.provider`: `'manual_upi'` | `'mock_gateway'` | `'razorpay'` (default: `'manual_upi'`)
- `payments.mode`: `'test'` | `'live'` (default: `'test'`)
- Managed via **Admin > Manage > Settings > Payments**. Changing provider warns the admin and logs to `audit_log`.

### 2.3 Database Schema (Additive Migrations)

```sql
-- Extend pay_mode enum
ALTER TYPE pay_mode ADD VALUE IF NOT EXISTS 'online';

-- Payments table
CREATE TYPE payment_purpose AS ENUM ('booking', 'bill', 'membership');
CREATE TYPE payment_status AS ENUM (
  'created', 'pending', 'authorized', 'captured', 'failed',
  'refund_pending', 'partially_refunded', 'refunded', 'expired'
);

CREATE TABLE payments (
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

-- Payment events table for raw webhook audit & idempotent replay
CREATE TABLE payment_events (
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

-- Refunds table
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  provider_refund_id TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'succeeded' | 'failed'
  reason TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_bill ON payments(bill_id);
CREATE INDEX idx_payments_provider_order ON payments(provider_order_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### 2.4 RPCs & Edge Functions Catalog (Part 1)

1. `rpc_create_payment_order(p_purpose, p_ref_id, p_amount_paise, p_provider, p_idempotency_key)`:
   - Validates existence of booking/bill, ensures no active captured payment already exists.
   - Inserts row into `payments` in `created` status. Returns payment row.
2. `rpc_record_payment_event(p_provider, p_provider_event_id, p_type, p_payload)`:
   - Idempotently stores raw webhook/event payload. If `provider_event_id` exists, returns existing record.
3. `rpc_verify_and_capture_payment(p_payment_id, p_provider_payment_id, p_method, p_raw)`:
   - Atomically updates payment status to `captured`.
   - If `purpose = 'booking'`:
     - Checks if booking is within hold window.
     - If slot is free: flips booking to `confirmed`.
     - If slot has expired and table was re-booked: leaves booking `expired`, marks payment `refund_pending`, triggers alert `payment_late_refund_due`.
   - If `purpose = 'bill'`:
     - Records payment in `bill_payments` with mode `'online'`, credits bill total.
4. `rpc_process_refund(p_payment_id, p_amount_paise, p_reason, p_provider_refund_id)`:
   - Inserts row into `refunds`, updates payment status to `refunded` or `partially_refunded`.
   - If booking associated: updates booking deposit refunded status.
5. Edge Function `payments-create-order`:
   - Validates user JWT / session, reads active provider, delegates to provider `.createOrder()`, calls `rpc_create_payment_order`.
6. Edge Function `payments-verify`:
   - Validates frontend client return payload (e.g. Razorpay response), calls provider `.verifyPayment()`, calls `rpc_verify_and_capture_payment`.
7. Edge Function `payments-webhook`:
   - Public endpoint receiving HTTP POST.
   - Reads RAW body, verifies HMAC signature with provider secret. Rejects forged signatures with 400.
   - Calls `rpc_record_payment_event`. If already processed, returns 200 immediately (idempotent).
   - Dispatches event to `rpc_verify_and_capture_payment` or `rpc_process_refund`.
8. Cron `fn_reconcile_payments` (every 5 min):
   - Queries `payments` where `status = 'pending'` and `created_at < now() - INTERVAL '15 minutes'`.
   - Invokes provider `.fetchStatus()`, resolves mismatches, creates admin alert if discrepancy detected.

---

## 3. Part 2: Real Customer Accounts

### 3.1 Authentication Specifications
- Authentication methods: **Email + Password** and **Google Sign-In** only.
- No OTP or SMS phone verification.
- Password requirements: minimum 8 characters, checked against client-side strength meter and server-side validation.
- Routes:
  - `/account/register`: Signup form (Name, Email, Phone, Password, Confirm) + "Continue with Google".
  - `/account/login`: Email/Password or Google login.
  - `/account/forgot-password`: Send password reset email.
  - `/account/reset-password`: Enter new password via recovery token.
  - `/account`: Customer portal dashboard (Profile overview, loyalty points, active membership, quick actions).
  - `/account/bookings`: List of upcoming and past bookings with status chips, ticket links, cancellation and refund status.
  - `/account/profile`: Edit name, phone, password update.

### 3.2 Role System & Database Hardening
- Extend `user_role` enum: `'admin'`, `'staff'`, `'customer'`.
- Trigger on `auth.users`: Creates a row in `profiles` with role `'customer'` ONLY. Client cannot choose role.
- Customer link: `customers.user_id` (UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL).
- Link status enum: `link_status`: `'unlinked'`, `'pending_review'`, `'approved'`, `'rejected'`.

```sql
-- Migration 0014: Customer Accounts
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';

CREATE TYPE customer_link_status AS ENUM ('unlinked', 'pending_review', 'approved', 'rejected');

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_status customer_link_status NOT NULL DEFAULT 'unlinked',
  ADD COLUMN IF NOT EXISTS link_notes TEXT;

-- Hardened Trigger on auth.users for new signups
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role := 'customer';
  v_customer_id UUID;
  v_points_count INT := 0;
  v_membership_count INT := 0;
  v_bills_count INT := 0;
  v_phone TEXT;
BEGIN
  -- Prevent registration using reserved domains or reserved admin emails
  IF NEW.email LIKE '%@tcn.local' THEN
    RAISE EXCEPTION 'Registration with @tcn.local domain is forbidden.';
  END IF;

  -- Insert profile with STRICT customer role
  INSERT INTO profiles (id, branch_id, role, name, username, email, active)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6),
    NEW.email,
    TRUE
  );

  v_phone := NEW.raw_user_meta_data->>'phone';
  IF v_phone IS NOT NULL AND v_phone ~ '^[6-9]\d{9}$' THEN
    SELECT id, points INTO v_customer_id, v_points_count
    FROM customers
    WHERE phone = v_phone AND user_id IS NULL
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      -- Check if high value history exists
      SELECT count(*) INTO v_membership_count FROM customer_memberships WHERE customer_id = v_customer_id;
      SELECT count(*) INTO v_bills_count FROM bills WHERE customer_id = v_customer_id;

      IF v_points_count > 0 OR v_membership_count > 0 OR v_bills_count > 0 THEN
        UPDATE customers
        SET user_id = NEW.id, link_status = 'pending_review', link_notes = 'Phone match with historical activity. Awaiting admin review.'
        WHERE id = v_customer_id;
      ELSE
        UPDATE customers
        SET user_id = NEW.id, link_status = 'approved'
        WHERE id = v_customer_id;
      END IF;
    ELSE
      -- Create new customer CRM record
      INSERT INTO customers (branch_id, name, phone, user_id, link_status)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        COALESCE(NEW.raw_user_meta_data->>'name', 'Valued Customer'),
        v_phone,
        NEW.id,
        'approved'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Security Invariants (Mandatory & Tested)
1. **Zero Access for Customers to Staff/Admin Resources**:
   - Helper function `fn_is_staff_or_admin()` checks `auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'staff') AND active = true)`.
   - All operational tables (`game_tables`, `sessions`, `orders`, `bills`, `expenses`, `attendance`, `rate_rules`, `audit_log`, `auth_events`) check `fn_is_staff_or_admin()`. Customer JWTs are completely rejected.
2. **Admin Claim Hardening (`rpc_claim_profile`)**:
   - Enforces `auth.jwt() ->> 'app_metadata' ->> 'provider' = 'google'`.
   - Enforces `auth.jwt() ->> 'email_verified' = 'true'`.
   - If not Google-authenticated and email verified, throws an exception immediately.
3. **Phone-Claim Isolation**:
   - If `link_status = 'pending_review'`, customer query on points/memberships returns 0 until approved by admin.
   - Admin approves or rejects via **Admin > Customers > Link Requests** (`rpc_review_customer_link(customer_id, approve)`).

---

## 4. Part 3: Auth Activity Audit

### 4.1 Schema: `auth_events` Table

```sql
CREATE TYPE auth_event_type AS ENUM (
  'login', 'logout', 'login_failed', 'register',
  'password_reset_requested', 'password_changed',
  'google_login', 'session_expired', 'link_requested'
);

CREATE TYPE auth_method_type AS ENUM ('email', 'google', 'staff_pin');

CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role user_role,
  identifier_masked TEXT NOT NULL, -- e.g. "ra***@tcn.in" or "staff_1***"
  event auth_event_type NOT NULL,
  method auth_method_type NOT NULL,
  ip TEXT,
  user_agent TEXT,
  device_label TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_events_created ON auth_events(created_at DESC);
CREATE INDEX idx_auth_events_user ON auth_events(user_id);
CREATE INDEX idx_auth_events_identifier ON auth_events(identifier_masked);
```

### 4.2 Logging RPC: `rpc_log_auth_event`
- Signature: `rpc_log_auth_event(p_event, p_method, p_identifier, p_success, p_user_id, p_meta)`
- Security: `SECURITY DEFINER`, callable by anonymous users (for failed logins) and authenticated users.
- Protections:
  - Validates `length(p_identifier) <= 100`, `pg_column_size(p_meta) <= 2048`.
  - Rate limits unauthenticated calls: max 20 logs per minute per IP.
  - Masks identifier (e.g., `user@domain.com` -> `u***r@domain.com`). Never logs raw credentials or PINs.
  - Extracts IP and User-Agent from `current_setting('request.headers', true)::json`.

### 4.3 Brute Force & Suspicious Activity Detection
- Alert rule `auth_suspicious`:
  - When a `login_failed` event is logged, checks count of failures for the same identifier or IP within the last 10 minutes.
  - If count >= 5: inserts row into `alerts` with `type = 'auth_suspicious'`, notifying owner dashboard bell and push.
  - When an admin logs in from a previously unseen User-Agent / IP: triggers informational security notice.

### 4.4 Data Retention & Cleanup
- Cron job `fn_prune_auth_events()` runs daily at 04:00 UTC, deleting records older than 180 days.

---

## 5. Trace Catalog (Canonical Traces)

### 5.1 Payments Traces (`PAY-xx`)
- **PAY-01 (Create Gateway Order)**:
  `L1 PublicBookingPage / BillPreviewSheet → L2 PaymentMethodSelector → L3 useCreatePaymentOrder → L4 paymentsService.createOrder → L5 Edge Function payments-create-order → L5 rpc_create_payment_order → L6 payments (status='created')`
- **PAY-02 (Verify & Capture Webhook / Client Return)**:
  `L5 Edge Function payments-webhook / payments-verify → L5 rpc_record_payment_event → L5 rpc_verify_and_capture_payment → L6 payments (status='captured') → L6 bookings (status='confirmed') → L7 Realtime 'tcn_venue_realtime' → L3 invalidate bookings/payments → L2 Ticket flips to Confirmed`
- **PAY-03 (Late Capture Post-Expiry Auto-Refund)**:
  `L5 payments-webhook → L5 rpc_verify_and_capture_payment → [Slot expired & taken] → L6 payments (status='refund_pending') → L6 alerts (type='payment_late_refund_due') → L4 paymentsService.refund → L5 Edge Function payments-refund → L6 refunds`
- **PAY-04 (Admin Process Refund)**:
  `L1 AdminManagePaymentsPage → L2 RefundModal (Reason + Admin PIN) → L3 useRefundPayment → L4 paymentsService.refund → L5 Edge Function payments-refund → L5 rpc_process_refund → L6 refunds, payments (status='refunded') → L6 audit_log`
- **PAY-05 (Reconciliation Cron)**:
  `Y-04 Cron fn_reconcile_payments (every 5 min) → L5 Edge Function payments-reconcile → Provider.fetchStatus() → Mismatches flagged in payments.raw->'reconciliation_flag' + admin alert`

### 5.2 Customer Accounts Traces (`ACC-xx`)
- **ACC-01 (Customer Register Email/Password)**:
  `L1 RegisterPage → L2 RegisterForm → L3 useCustomerRegister → L4 customerAuthService.register → L5 supabase.auth.signUp → L6 DB Trigger fn_handle_new_user → L6 profiles (role='customer'), customers (link_status='approved'|'pending_review') → L5 rpc_log_auth_event → L1 Navigate to /account`
- **ACC-02 (Customer Login Email/Password)**:
  `L1 CustomerLoginPage → L2 LoginForm → L3 useCustomerLogin → L4 customerAuthService.loginWithPassword → L5 supabase.auth.signInWithPassword → L5 rpc_log_auth_event → L1 Navigate to returnUrl or /account`
- **ACC-03 (Customer Continue with Google)**:
  `L1 CustomerLoginPage / RegisterPage → L2 GoogleButton → L3 useCustomerGoogleLogin → L4 customerAuthService.loginWithGoogle → L5 supabase.auth.signInWithOAuth({ provider: 'google' })`
- **ACC-04 (Customer View Bookings)**:
  `L1 CustomerBookingsPage → L2 BookingCardList → L3 useCustomerBookings → L4 customerService.getMyBookings → L5 SELECT * FROM bookings WHERE customer_id = my_customer_id`
- **ACC-05 (Customer Cancel Booking)**:
  `L1 CustomerBookingsPage → L2 CancelBookingDialog → L3 useCustomerCancelBooking → L4 customerService.cancelBooking → L5 rpc_cancel_booking → L5 (if eligible for refund) rpc_process_refund`
- **ACC-06 (Admin Review Phone Link Request)**:
  `L1 AdminCustomersPage → L2 LinkRequestsModal → L3 useReviewCustomerLink → L4 customersService.reviewLink(customerId, approve) → L5 rpc_review_customer_link → L6 customers (link_status='approved'|'rejected') → L6 audit_log`

### 5.3 Auth Audit Traces (`SEC-xx`)
- **SEC-01 (Log Successful Login)**:
  `L4 authService / customerAuthService → L5 rpc_log_auth_event(event='login', success=true) → L6 auth_events`
- **SEC-02 (Log Failed Login & Brute Force Check)**:
  `L4 authService / customerAuthService → L5 rpc_log_auth_event(event='login_failed', success=false) → L6 auth_events → [Count >= 5 in 10m] → L6 alerts (type='auth_suspicious')`
- **SEC-03 (Admin View Login History)**:
  `L1 AdminSecurityAuditPage → L2 LoginHistoryTab → L3 useAuthEvents(filters) → L4 authAuditService.getEvents → L5 SELECT FROM auth_events WHERE ...`
- **SEC-04 (Export Login History CSV)**:
  `L1 AdminSecurityAuditPage → L2 ExportButton → L4 authAuditService.exportCsv → Browser Download`

---

## 6. End-to-End Test Suite Mapping (E2E-8..13)

| ID | Suite Name | Description | Key Invariants Tested |
|---|---|---|---|
| **E2E-8** | Customer Register, Book, Pay, Confirm | Customer signs up with email/password, books a pool table, pays deposit via `mock_gateway`, ticket automatically updates to Confirmed. | Account creation, auto-link, gateway order, webhook capture, live status update. |
| **E2E-9** | Customer Logout & Protected Routes | Customer logs out; auth events captured; `/account/*` redirects to `/account/login`; `/book` preserves slot deep-link across login. | Deep-link state persistence, auth event logging on logout, route protection. |
| **E2E-10**| Customer Privilege Isolation & Claim Attack | Customer attempts to query `game_tables`, `bills`, `expenses`, calls `rpc_start_session`, tries to register `@tcn.local` or spoof admin claim. | 100% rejection with 403 / permission denied; admin Google claim hardening validation. |
| **E2E-11**| Phone Claim Approval Flow | Customer registers with phone number having existing walk-in points; links with `pending_review`; points hidden until admin approves in Admin Customers. | Data leakage prevention; side-by-side admin comparison and audit log. |
| **E2E-12**| Password Forgot & Reset Flow | Customer triggers forgot password; reset token received; new password submitted; old password rejected, new password authenticated. | Safe reset lifecycle; auth event logging. |
| **E2E-13**| Payment Edge Cases & Failure Recovery | Test failure then retry; delayed webhook; duplicate webhook (idempotency); late webhook after hold expiry (auto-refund path); cancel within window (refund). | Gateway idempotency, double-booking prevention, refund trigger. |

---

## 7. Migration & Rollout Plan

1. **Database Migrations**:
   - `0013_payments_schema.sql`: Tables `payments`, `payment_events`, `refunds`, enum extensions.
   - `0014_customer_accounts.sql`: User role enum extension, `customers.user_id`, `customers.link_status`, signup trigger.
   - `0015_auth_events_audit.sql`: Table `auth_events`, `rpc_log_auth_event`, brute force alert trigger.
   - `0016_payments_rpcs.sql`: RPCs for order creation, capture, refund, and reconciliation.
   - `0017_security_hardening_rls.sql`: Audit and update all RLS policies to enforce `fn_is_staff_or_admin()`.
2. **Frontend Layer Upgrades**:
   - Create `src/services/payments/` (`types.ts`, `provider.ts`, `manualUpi.ts`, `mockGateway.ts`, `razorpay.ts`, `index.ts`).
   - Create `src/services/customerAuth.ts` and `src/services/authAudit.ts`.
   - Update `src/lib/schemas.ts` with customer registration and payment validation schemas.
   - Build customer account pages (`/account/*`) and customer layout/nav bar dropdown.
   - Build Admin Manage Payments (`/admin/manage/payments`) and Security & Audit (`/admin/manage/security`).
3. **Verification**:
   - Run pgTAP migrations test suite.
   - Run Vitest unit tests (payment providers, signature HMAC, customer auth, RLS assertions).
   - Run Playwright E2E suites E2E-1 through E2E-13.
