# TCN – The Cue Nation: Technical Requirements Document (TRD)

Version 1.0 · Read with `TCN_PRD.md` (what/why, action traces) and `TCN_DESIGN.md` (UI).

---

## 1. Architecture decisions

| # | Decision | Reason |
|---|---|---|
| D1 | **No custom Node/Express backend in v1.** Business logic lives in **Postgres functions (`rpc_*`)** and a few **Supabase Edge Functions**. | Budget is Rs 0. Free Render sleeps (30-60 s cold start) and is unusable for a POS. RPCs are transactional, fast, and need no server. |
| D2 | **No Prisma in v1.** Use `supabase gen types typescript` for typed DB access. | Prisma needs a Node server; without one it adds no value. Express + Prisma can be added later behind the same service layer (L4) without UI changes. |
| D3 | **PWA with offline queue** for table operations. | Cafe wifi drops must not stop billing. |
| D4 | **Server time is authoritative** for timers and billing. | Phones have wrong clocks; multi-device consistency. |
| D5 | **Staff login = username + 6-digit PIN** (Supabase email/password under the hood). **Admin = Google OAuth** restricted to pre-registered emails. | Staff do not need Google accounts. |
| D6 | **`branch_id` column everywhere** with one seeded branch. UI is single-branch. | Cheap future multi-branch. |
| D7 | **Idempotent mutations** (`op_id` UUID per queued operation). | Safe replay after offline/retry. |

### 1.1 System diagram

```
Browser PWA (Vercel)                                   Supabase (Free)
┌────────────────────────────────────┐   HTTPS/WS     ┌──────────────────────────────┐
│ L1 Pages → L2 Components           │                │ Auth (Google + email/pw)     │
│ L3 Hooks/Stores (TanStack, Zustand)│ ─────────────► │ L5 RPC (plpgsql) + Edge Fns  │
│ L4 Services (supabase-js only here)│                │ L6 Postgres + RLS + triggers │
│ L8 Offline queue (Dexie/IndexedDB) │ ◄───────────── │ L7 Realtime (postgres_changes)│
│ Service Worker (Workbox)           │                │ pg_cron (alerts, expiry)     │
└────────────────────────────────────┘                └──────────────────────────────┘
```

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Styling/UI | Tailwind CSS, shadcn/ui (Radix), `lucide-react` icons, `class-variance-authority` |
| Routing | React Router v6 (data router, lazy routes, route guards) |
| Server state | TanStack Query v5 |
| Client state | Zustand (UI, cart, offline status) |
| Forms | react-hook-form + zod |
| Dates | date-fns + date-fns-tz (`Asia/Kolkata`) |
| Charts | Recharts |
| Offline | Dexie (IndexedDB), `vite-plugin-pwa` (Workbox, `registerType: 'prompt'`) |
| PDF / QR | `jspdf` + `jspdf-autotable`; `qrcode` |
| Backend | Supabase: Postgres 15+, Auth, Realtime, Edge Functions (Deno), `pg_cron`, `pgcrypto` |
| Captcha | Cloudflare Turnstile (free) on `/book` |
| Hosting | Vercel Hobby (frontend), Supabase Free (backend) |
| Tests | Vitest + Testing Library, pgTAP (billing/RLS), Playwright (smoke e2e) |
| Lint | ESLint + Prettier, `tsc --noEmit` in CI |

---

## 3. Repository structure

```
tcn/
├─ src/
│  ├─ app/            router.tsx, providers.tsx, guards.tsx
│  ├─ layouts/        AppShell.tsx, NavBar.tsx (bottom+sidebar), TopBar.tsx
│  ├─ pages/          admin/*, staff/*, public/*, auth/*
│  ├─ components/     ui/ (shadcn), tables/, bookings/, orders/, bills/, reports/, common/
│  ├─ hooks/          useSessions.ts, useBookings.ts, useBills.ts, ... (L3)
│  ├─ stores/         cartStore.ts, uiStore.ts, syncStore.ts
│  ├─ services/       sessions.ts, bookings.ts, orders.ts, bills.ts, customers.ts,
│  │                  discounts.ts, reports.ts, rates.ts, menu.ts, staff.ts,
│  │                  attendance.ts, expenses.ts, settings.ts, audit.ts, alerts.ts,
│  │                  auth.ts, public.ts                         (L4)
│  ├─ realtime/       RealtimeProvider.tsx, channels.ts          (L7)
│  ├─ offline/        db.ts (Dexie), queue.ts, sync.ts           (L8)
│  ├─ lib/            supabase.ts (ONLY here), time.ts (serverOffset), money.ts, upi.ts, pdf.ts, whatsapp.ts
│  ├─ types/          database.types.ts (generated), domain.ts
│  └─ styles/         index.css (tokens from TCN_DESIGN.md)
├─ supabase/
│  ├─ migrations/     0001_schema.sql … (see §13 order)
│  ├─ functions/      admin-create-staff, public-booking-create, public-booking-submit-utr, public-booking-status
│  ├─ seed.sql
│  └─ tests/          pgTAP: billing.sql, rls.sql
└─ docs/              TCN_PRD.md, TCN_TRD.md, TCN_DESIGN.md
```

**Rule**: `supabase-js` is imported only in `src/lib/supabase.ts` and used only by `src/services/**`. ESLint `no-restricted-imports` enforces this.

---

## 4. Environment and deployment

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel | Public by design; RLS protects data |
| `VITE_TURNSTILE_SITE_KEY` | Vercel | Public booking captcha |
| `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET` | Supabase Edge secrets | Never in the browser |
| `GOOGLE_CLIENT_ID/SECRET` | Supabase Auth provider config | OAuth |

- Vercel: SPA rewrite `/(.*) → /index.html`. Preview deploys per PR.
- Supabase: schema only via migrations (`supabase db push`). No manual dashboard edits.
- Free-tier notes: project pauses after 7 days idle (not an issue for daily use); keep audit/alert tables pruned (see §12).

---

## 5. Authentication and authorization

1. **Staff login**: UI asks username + PIN → `authService.signInStaff` calls `signInWithPassword({ email: `${username.toLowerCase()}@tcn.local`, password: pin })`. PIN is exactly 6 digits (zod). Edge Function `admin-create-staff` creates the Auth user with `email_confirm: true`.
2. **Admin login**: `signInWithOAuth('google')`. After redirect, `rpc_claim_profile()` links `auth.uid()` to the pre-seeded `profiles` row by verified email; if none exists, sign out and show "Not authorized".
3. **Profile**: `profiles(id = auth.users.id, role admin|staff, active, name, username, email)`. Inactive → RLS denies everything.
4. **Role helpers** (SQL, `security definer`, stable): `fn_role()`, `fn_is_admin()`, `fn_is_active()`.
5. **Admin approval PIN**: `profiles.approval_pin_hash` (bcrypt via `crypt(pin, gen_salt('bf'))`), set only by `rpc_set_admin_pin`. Verified by `rpc_apply_discount_with_pin` against **any active admin**; the matched admin id is recorded as approver. Failed attempts tracked in `pin_attempts(device/user, count, locked_until)`; 5 failures → 5 min lock.
6. **Route guards** (L1): `RequireAuth`, `RequireRole('admin')`. Guards are UX only; **RLS is the security boundary**.

---

## 6. Data model (L6)

All tables: `id uuid pk default gen_random_uuid()`, `branch_id uuid not null`, `created_at timestamptz default now()` unless noted. Money = `numeric(10,2)` (rupees). Times = `timestamptz`.

### 6.1 Enums
`user_role(admin,staff)` · `table_type(pool,snooker)` · `table_status(free,running,paused,maintenance)` · `session_status(running,paused,completed)` · `booking_status(pending_deposit,pending_verification,confirmed,checked_in,completed,cancelled,no_show,expired)` · `booking_source(walk_in,phone,online)` · `deposit_status(none,pending,verified,refund_due,refunded,forfeited,applied)` · `bill_status(draft,paid,void)` · `bill_kind(session,standalone,membership)` · `pay_mode(cash,upi)` · `discount_type(fixed,percent)` · `discount_req_status(pending,approved,rejected)` · `alert_type(booking_ending,table_idle,session_paused_long,deposit_pending,discount_request)` · `day_type(any,weekday,weekend)` · `customer_type(any,walk_in,member)`.

### 6.2 Tables

```
branches(id, name, timezone default 'Asia/Kolkata')
profiles(id = auth.users.id, branch_id, role, name, username unique, email unique, active bool,
         approval_pin_hash text null)
game_tables(id, branch_id, name, type table_type, status table_status default 'free',
            active bool default true, sort int)
rate_rules(id, branch_id, table_type, day_type, customer_type, start_time time, end_time time,
           rate_per_hour numeric, priority int, active bool)          -- end_time may wrap past midnight
customers(id, branch_id, phone unique per branch, name, loyalty_points int default 0, notes, created_by)
membership_plans(id, branch_id, name, price numeric, duration_days int, active bool)
customer_memberships(id, customer_id, plan_id, starts_on date, ends_on date, bill_id)
loyalty_ledger(id, customer_id, delta int, reason text, bill_id null, created_by)

sessions(id, branch_id, table_id(current), customer_id null, booking_id null, players int default 1,
         status session_status, started_at timestamptz, ended_at null, created_by, op_id uuid unique)
session_segments(id, session_id, table_id, started_at, ended_at null)
session_pauses(id, session_id, paused_at, resumed_at null)

bookings(id, branch_id, code text unique (6 chars), customer_id null, name, phone, table_type,
         table_id null, start_at, end_at, source booking_source, status booking_status,
         deposit_amount numeric, deposit_status deposit_status, deposit_method pay_mode null, utr text null,
         verified_by null, hold_until timestamptz null, cancel_reason text null, created_by null)
   -- EXCLUDE USING gist (table_id WITH =, tstzrange(start_at,end_at) WITH &&)
   --   WHERE (table_id IS NOT NULL AND status IN ('pending_deposit','pending_verification','confirmed','checked_in'))

menu_categories(id, branch_id, name, sort)
menu_items(id, branch_id, category_id, name, price numeric, available bool, sort)
orders(id, branch_id, session_id null, customer_id null, created_by, status text default 'open')
order_items(id, order_id, menu_item_id, name_snapshot, price_snapshot, qty int check (qty>0))

bills(id, branch_id, bill_no int generated per branch (sequence), kind bill_kind, session_id null, order_id null,
      customer_id null, status bill_status, table_charge numeric, table_breakdown jsonb, cafe_total numeric,
      discount_type null, discount_value null, discount_amount numeric default 0, discount_reason null,
      discount_approved_by null, loyalty_redeemed numeric default 0, deposit_applied numeric default 0,
      total numeric, created_by, paid_at null, void_reason null)
bill_payments(id, bill_id, mode pay_mode, amount numeric, payer_label text null, created_by)  -- negative = refund out
discount_requests(id, bill_id, type, value, reason, status, requested_by, decided_by null, decided_at null)

expenses(id, branch_id, spent_on date, category text, amount numeric, note, created_by)
attendance(id, branch_id, staff_id, check_in timestamptz, check_out null, edited_by null)
alerts(id, branch_id, type alert_type, ref_id uuid, message, audience user_role[], created_at,
       acked_by null, acked_at null, resolved_at null)   -- unique (type, ref_id) where resolved_at is null
settings(branch_id, key text, value jsonb, primary key(branch_id,key))
audit_log(id, branch_id, actor_id, action text, entity text, entity_id uuid, before jsonb, after jsonb, created_at)
op_log(op_id uuid primary key, user_id, rpc text, result jsonb, created_at)   -- idempotency
pin_attempts(key text primary key, fails int, locked_until timestamptz)
```

Indexes: `sessions(table_id) where status<>'completed'`, `bookings(start_at)`, `bills(status, created_at)`, `order_items(order_id)`, `audit_log(created_at desc)`.

### 6.3 Triggers
- `trg_audit` on `rate_rules`, `menu_items`, `settings`, `customers`(points), `attendance` updates → `audit_log`.
- `trg_bill_no` assigns per-branch sequential `bill_no`.
- `trg_game_table_status` is **not** used; status changes only inside RPCs (single writer).

---

## 7. Row Level Security matrix

Enable RLS on **all** tables. Policies use `fn_is_active()` plus role. `A` = admin, `S` = staff, `-` = none, `own` = rows created by `auth.uid()`.

| Table | Select | Insert/Update/Delete |
|---|---|---|
| profiles | A all; S own row | A (via edge fn / rpc) |
| game_tables | A,S | A (S none; status via RPC only) |
| rate_rules | A,S (read for estimate) | A |
| customers | A,S | A,S insert/update (name/phone); points only via RPC |
| membership_plans, menu_* | A,S | A |
| customer_memberships, loyalty_ledger | A; S read for the selected customer | RPC only |
| sessions, session_segments, session_pauses | A,S | RPC only |
| bookings | A,S | RPC only |
| orders, order_items | A,S | RPC only |
| bills | A all; **S: draft bills + bills they created today** | RPC only |
| bill_payments | A; S own bills today | RPC only |
| discount_requests | A all; S own | RPC only |
| expenses, audit_log, settings(except public keys) | **A only** | A (settings), expenses A, audit via triggers/RPC |
| attendance | A all; S own | RPC only (A edits) |
| alerts | by `audience` containing the user's role | A,S ack (own role audience) |
| op_log, pin_attempts | none (internal) | RPC only |

`settings` exposes a few public keys (`public.*`: venue name, UPI VPA is **not** public) through `rpc_public_info()` for the booking page.
Staff **cannot call** `rpc_report_*` or revenue aggregates (`fn_is_admin()` check at top of each).

---

## 8. RPC catalog (L5)

All `rpc_*` are `security definer`, `set search_path = public`, check `fn_is_active()` + role first, raise `errcode 'P0001'` with a stable code string (`E_FORBIDDEN`, `E_TABLE_BUSY`, `E_BAD_STATE`, `E_PIN_INVALID`, `E_PIN_LOCKED`, `E_OVERLAP`, `E_VALIDATION`). Queueable ones take `p_op_id uuid` first and are idempotent via `op_log` (if `op_id` exists, return stored `result`).

| RPC | Role | Behavior (single transaction) |
|---|---|---|
| `rpc_now()` | any | returns `now()` for client clock offset |
| `rpc_upsert_customer(phone, name)` | A,S | insert/update by phone; returns row |
| `rpc_start_session(op_id, table_id, customer_id, players, booking_id)` | A,S | lock table row `for update`; require `status='free'`; insert session + first segment + empty order; set table `running`; if booking: must be `confirmed` and table/time compatible → `checked_in` |
| `rpc_pause_session(op_id, session_id)` | A,S | require running; insert pause; session+table `paused` |
| `rpc_resume_session(op_id, session_id)` | A,S | close open pause; `running` |
| `rpc_transfer_session(op_id, session_id, to_table_id)` | A,S | require destination free & same or any type; close segment, open new; source→free, dest→status of session; `sessions.table_id=dest` |
| `rpc_set_players(op_id, session_id, n)` | A,S | validate 1..12 |
| `rpc_stop_session(op_id, session_id)` | A,S | close open pause/segment; session `completed`; table `free`; create/refresh `bills(draft)` with `table_charge`, `table_breakdown`, `cafe_total`, `deposit_applied` (verified deposit of linked booking); returns bill |
| `rpc_add_order_items(op_id, session_id, items jsonb)` | A,S | items `[ {menu_item_id, qty} ]`; reject unavailable items; snapshot price; refresh draft bill totals if exists |
| `rpc_update_order_item(op_id, item_id, qty)` | A,S | reject if bill paid; qty 0 deletes |
| `rpc_create_standalone_order(op_id, items, customer_id)` | A,S | order + items + `bills(kind='standalone', draft)` |
| `rpc_calc_bill_preview(bill_id)` | A,S(own) | recompute totals for a draft **without writing**; returns lines (see §10) |
| `rpc_create_booking(op_id?, source, table_type, table_id, start_at, hours, name, phone, deposit_mode, utr)` | A,S | validates slot rules, overlap constraint; staff path sets `confirmed` when deposit recorded |
| `rpc_confirm_deposit(booking_id, utr, method)` | A,S | `deposit_status='verified'`, status `confirmed`, `verified_by`, resolves alert |
| `rpc_decide_booking(booking_id, approve, reason)` | A | approve → same as confirm; reject → `cancelled` |
| `rpc_cancel_booking(booking_id, reason)` | A,S | refund/forfeit rule (AS-3) |
| `rpc_mark_no_show(booking_id)` | A | `no_show`, deposit `forfeited` |
| `rpc_request_discount(bill_id, type, value, reason)` | S,A | pending request + alert (audience admin) |
| `rpc_decide_discount(request_id, approve)` | A | approve writes bill discount fields, `discount_approved_by`; audit |
| `rpc_apply_discount_with_pin(bill_id, type, value, reason, pin)` | S,A | PIN check with lockout; writes discount; audit |
| `rpc_finalize_bill(op_id?, bill_id, payments jsonb, redeem_points int)` | A,S | recompute, require `sum(payments)=due`, mark paid, insert payments, ledger earn/redeem, `deposit_status='applied'`, booking `completed`; **not queueable** |
| `rpc_void_bill(bill_id, reason)` | A | status `void`; reverse ledger; audit |
| `rpc_sell_membership(customer_id, plan_id, payments)` | A | membership + paid bill (kind membership) |
| `rpc_adjust_points(customer_id, delta, reason)` | A | ledger + audit |
| `rpc_set_table_maintenance(table_id, on)` | A | reject if active session |
| `rpc_attendance_toggle()` | S,A | open → close; none → open |
| `rpc_set_admin_pin(pin)` | A | bcrypt hash into own profile |
| `rpc_claim_profile()` | authenticated | link Google user to pre-seeded admin profile |
| `rpc_public_availability(date, type)` | anon | free hourly slots (counts only, no PII) |
| `rpc_public_info()` | anon | venue name, hours, deposit amount |
| `rpc_report_daily_revenue(from,to)` | A | per day: table, cafe, membership, total, bills count, sessions |
| `rpc_report_utilization(from,to)` | A | per table: active minutes / open minutes |
| `rpc_report_peak_hours(from,to)` | A | matrix day-of-week × hour → active minutes + revenue |
| `rpc_report_top_items(from,to,limit)` | A | item, qty, revenue |
| `rpc_report_profit(from,to)` | A | revenue − expenses by day and by category |

### 8.1 Edge Functions (Deno)

| Function | Auth | Does |
|---|---|---|
| `admin-create-staff` | admin JWT | create/reset/deactivate staff Auth user + profile (service role) |
| `public-booking-create` | anon | verify Turnstile; rate limit (5/hour per IP and phone); call RPC with service role to insert `pending_deposit` booking, set `hold_until`; return `code` and deposit details |
| `public-booking-submit-utr` | anon | verify `code`+`phone`; set UTR, `pending_verification`; create alert |
| `public-booking-status` | anon | return status for `code`+`phone` only |

---

## 9. Realtime and cache invalidation (L7 → L3)

Single `RealtimeProvider` mounted in `AppShell` (after auth). Filter by `branch_id`.

| Channel (table) | Events | Invalidates query keys |
|---|---|---|
| `game_tables` | UPDATE | `['tables']` |
| `sessions`, `session_pauses`, `session_segments` | I/U | `['tables']`, `['session', id]`, `['bill-preview']` |
| `bookings` | I/U | `['bookings']`, `['availability']` |
| `order_items`, `orders` | I/U/D | `['session', id]`, `['bills']` |
| `bills`, `bill_payments`, `discount_requests` | I/U | `['bills']`, `['bill', id]`, `['discounts']` |
| `alerts` | I/U | `['alerts']` (also triggers toast + optional sound) |
| `menu_items`, `menu_categories` | I/U/D | `['menu']` |
| `profiles` (own row) | U | forces sign-out if `active=false` |

Query keys are centralized in `src/hooks/keys.ts`. On realtime reconnect, invalidate all active queries. Show connection badge (online / reconnecting / offline).

Timer rendering: `useTicker()` (1 s) computes `now = Date.now() + serverOffset`; elapsed = `now − started_at − pausedTotal`. No per-second network calls.

---

## 10. Billing algorithm (authoritative)

Implemented in SQL function `fn_compute_table_charge(session_id, at timestamptz)` used by `rpc_stop_session` and `rpc_calc_bill_preview`.

```
settings: block = billing.block_minutes (15), min = billing.min_minutes (60), tz = Asia/Kolkata
1. For each segment s ordered by started_at:
     s_end = coalesce(s.ended_at, at)
     active_s = (s_end - s.started_at) - overlap(pauses within [s.started_at, s_end])
2. total_active = sum(active_s)
3. billable_min = greatest(ceil(total_active_minutes), min)
   if billable_min > min: billable_min = min + ceil((total_active_minutes - min)/block)*block
4. block_count = billable_min / block
5. Walk blocks along the ACTIVE timeline (skipping pauses). For block i, block_start_wall_time =
   wall-clock time at which that block's active time began (inside its segment). For top-up blocks
   beyond actual time (minimum), use the final segment's end time.
6. rate_i = resolve_rate(segment.table_type, block_start_wall_time (in tz), customer_type)
7. table_charge = round( sum(rate_i / (60/block)) + extra_player_fee_total )
8. Output breakdown jsonb: [{from, to, table_id, rate, blocks, amount}], grouped by consecutive equal rate.
```

`resolve_rate`: `customer_type = 'member' if active membership on that date else 'walk_in'`; candidate rules match `table_type`, `day_type in (any, weekday|weekend of the date)`, `customer_type in (any, ct)`, and `start_time <= t < end_time` (wrap-around when `end_time <= start_time`). Choose highest `priority`, tie → most specific (non-`any` fields). If none: raise `E_VALIDATION('No rate rule')`. UI blocks table activation until at least one catch-all rule exists per table type.

Totals: `cafe_total = sum(price_snapshot*qty)`; `total = table_charge + cafe_total − discount_amount − loyalty_redeemed − deposit_applied` (floor 0 on collectible amount; any negative becomes a refund row). Percent discounts apply to `table_charge + cafe_total`. Round all stored money to 2 dp; display whole rupees.

pgTAP cases (required): 20 min → 60 min charge; exactly 60; 67 min → 75 charged; pause 10 min inside; transfer across peak boundary; member vs walk-in; Saturday rule; wrap-past-midnight band; no-rule error.

---

## 11. Offline queue (L8)

- Dexie DB `tcn_offline`: `ops(id=op_id, rpc, args, created_at, status pending|sent|failed, error)`, plus read-through cache for `tables`, `sessions`, `menu_items`, `rate_rules`, `customers` (recent), `settings`.
- Queueable RPCs (`Q` in PRD): start, pause, resume, transfer, set_players, stop, add_order_items, update_order_item, create_standalone_order. Services call `queue.run(rpcName, args)`:
  1. If online: call RPC directly; on **network** error → enqueue and apply optimistic update.
  2. If offline: enqueue and apply optimistic update to TanStack cache.
- `sync.ts` replays `pending` ops **in order** (single flight) on `online` event and every 15 s when pending > 0. Server idempotency by `op_id`. On business error (`E_BAD_STATE`, `E_TABLE_BUSY`): mark `failed`, notify user with the table name and reason, refetch truth.
- Conflict policy: **server wins**; first writer on a table wins (`for update` lock). Offline optimistic state is always reconciled by refetch after sync.
- Offline-disabled UI: buttons for non-queueable actions show a tooltip "Needs internet" and are disabled while offline.
- `syncStore` exposes `{online, pendingCount, syncing, lastError}`; `OfflineBanner` in `AppShell`.
- PWA: precache app shell; runtime cache for static assets; **never cache RPC/API responses in the service worker** (Dexie is the only data cache).

---

## 12. Frontend architecture rules

1. **Layering** (see PRD §4): pages → components → hooks → services → (queue) → RPC. No skipping.
2. **Hooks** return `{data, isLoading, error}` for reads and `{mutate, isPending}` for writes; mutations show toast on error using the stable error code → message map in `src/lib/errors.ts`.
3. **Optimistic updates** only for queueable ops (cache patch + rollback on failed op).
4. **Forms**: zod schemas in `src/lib/schemas.ts`, shared by form and service input validation.
5. **Money**: integers in paise internally on the client (`money.ts`), format `en-IN` with `Rs`/rupee symbol; never use floats for arithmetic.
6. **Errors/empty/loading**: every list has skeleton, empty state (design doc), and error state with retry.
7. **Sheets vs dialogs**: mobile = bottom sheet (`Sheet side=bottom`), >= 768px = centered dialog (`Dialog`), via a `ResponsiveModal` wrapper.
8. **Accessibility**: focus trap in modals, `aria-live` for toasts, status text + icon (never color only).
9. **Code splitting**: lazy-load `/admin/reports` (Recharts) and `jspdf`.
10. **Data pruning**: nightly pg_cron deletes `alerts` older than 14 days and `op_log` older than 30 days; `audit_log` kept.

---

## 13. Migration order

1. `0001_extensions_enums.sql` (pgcrypto, btree_gist, pg_cron; enums)
2. `0002_core_tables.sql` (branches, profiles, game_tables, rate_rules, customers, plans, memberships, ledger)
3. `0003_ops_tables.sql` (sessions, segments, pauses, bookings + exclusion, menu, orders, bills, payments, discounts, expenses, attendance, alerts, settings, audit, op_log, pin_attempts)
4. `0004_helpers.sql` (`fn_role`, `fn_is_admin`, `fn_is_active`, `fn_resolve_rate`, `fn_compute_table_charge`)
5. `0005_rpc_sessions.sql`, `0006_rpc_orders_bills.sql`, `0007_rpc_bookings.sql`, `0008_rpc_admin_reports.sql`, `0009_rpc_public.sql`
6. `0010_rls.sql` (enable RLS + policies per §7)
7. `0011_cron.sql` (alerts every minute, booking expiry, pruning)
8. `0012_realtime.sql` (`alter publication supabase_realtime add table ...` for §9 tables)
9. `seed.sql`: 1 branch, 6 tables (Pool 1-3, Snooker 1-3), default catch-all rate rules (placeholders to be edited by owner), sample menu, settings defaults (Section 3 of PRD), 1 admin profile placeholder email.

---

## 14. Testing and quality gates

- **pgTAP**: billing cases (§10), RLS (staff cannot select `expenses`, `audit_log`, report RPCs; staff cannot update `game_tables`), state-machine guards, idempotency (same `op_id` twice → one session).
- **Vitest**: money utils, time offset, queue ordering, schema validation, `PaymentEditor` split math.
- **Playwright smoke** (against a Supabase test project): login staff → start → add item → stop → discount request → admin approve → mark paid; mobile (390x844) and desktop (1280x800) viewports; assert bottom nav vs sidebar.
- CI (GitHub Actions): `tsc --noEmit`, lint, unit tests, `supabase db lint`.

---

## 15. Build phases

1. **Foundation**: repo, Tailwind tokens, shadcn setup, AppShell (bottom nav / sidebar), auth (staff PIN + Google), guards, migrations 1-4, seed.
2. **Tables and sessions**: board, start/pause/resume/transfer/stop, realtime, ticker, server clock, billing function + tests.
3. **Orders and bills**: menu, cart, add-to-session, standalone, bill detail, payments, split, UPI QR, finalize, PDF/WhatsApp.
4. **Discounts, customers, loyalty, memberships**.
5. **Bookings** (staff) + public `/book` flow + deposits + expiry + alerts.
6. **Admin**: Home KPIs, reports, manage (rates, menu, staff, attendance, expenses, settings, audit).
7. **Offline/PWA**: Dexie queue, sync, install prompt, offline banner.
8. **Hardening**: RLS tests, e2e, accessibility pass, performance pass, seed real data, deploy.

Definition of done per phase: all traces in PRD §7 for that phase work end to end through every layer, tests green, no `any`, no direct supabase imports outside L4.
