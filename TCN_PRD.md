# TCN – The Cue Nation: Product Requirements Document (PRD)

Version 1.0 · Companion docs: `TCN_TRD.md` (technical), `TCN_DESIGN.md` (design system + UI layouts)

---

## 0. How to read this document (for the coding agent)

- Every user action is documented as a **trace**: a chain of calls through numbered **layers** (Section 4). Implement exactly that chain; do not skip or merge layers.
- IDs: `A-xx` admin actions, `S-xx` staff actions, `P-xx` public (customer) actions, `Y-xx` system jobs. Shared actions are defined once and referenced.
- Function names (`useStartSession`, `sessionsService.start`, `rpc_start_session`) are the **canonical names**. Use them verbatim. Signatures are in `TCN_TRD.md`.
- Items marked **ASSUMPTION** were not confirmed by the owner. Implement them as **editable settings** (Admin › Manage › Settings), never as hardcoded constants.

---

## 1. Product overview

**TCN – The Cue Nation** is a cafe + cue-sports venue with 6 tables (3 pool, 3 snooker) and a cafe. This product is a **POS and management web app** (PWA) used on phones, a counter tablet, and desktop.

**Goals**
1. Run table sessions (start, pause, transfer, stop) with accurate server-side timers and billing.
2. Take bookings from walk-ins, phone/WhatsApp (staff-entered), and online self-booking with a mandatory deposit.
3. Take cafe orders attached to a table session or as standalone sales.
4. Generate bills, collect cash/UPI (including split bills), share PDF/WhatsApp receipts.
5. Give the owner live visibility and reports from anywhere.
6. Keep working through short internet drops (offline queue).

**Non-goals (v1)**: kitchen display screen, stock tracking, card payments, GST invoices, multi-language, thermal printing, payment gateway, multi-branch UI (schema is ready), public marketing website.

---

## 2. Users and roles

| Role | Who | Login | Access |
|---|---|---|---|
| **Admin** | Owner (and optional co-admins) | Google (email must be pre-registered in `profiles`) | Everything, incl. reports, rates, staff, settings, audit. Can also open the Staff panel. |
| **Staff** | Cashier/floor staff, 2-3 per shift | Username + 6-digit PIN | Operate tables, bookings, orders, bills, own attendance. **No revenue/reports/expenses/settings.** |
| **Customer** (public) | Walk-in/online guest | None (phone + name on booking form) | Only the public `/book` page. |

Discounts require an **Admin PIN** (Section 6.6). Staff never see revenue aggregates; they only see the totals of bills they are collecting.

---

## 3. Assumptions (owner can change via Settings)

| # | Assumption | Setting key |
|---|---|---|
| AS-1 | After the first hour, time is billed in **15-minute blocks, rounded up**. | `billing.block_minutes` = 15 |
| AS-2 | Minimum billing = **1 hour** per session. | `billing.min_minutes` = 60 |
| AS-3 | Deposit = **fixed amount per booking** (default Rs 100), adjusted against the final bill. Refundable if cancelled at least **2 hours** before start; else forfeited. | `deposit.amount`, `deposit.refund_hours` |
| AS-4 | Loyalty: **1 point per Rs 10** paid; **1 point = Rs 1** on redemption; max **50%** of a bill redeemable. | `loyalty.earn_per_rs`, `loyalty.point_value`, `loyalty.max_redeem_pct` |
| AS-5 | Membership plan = name, price, duration in days. Benefit = **member rates** from the rate rules. | `membership_plans` |
| AS-6 | Weekend = Saturday and Sunday. Timezone `Asia/Kolkata`. | `business.weekend_days`, `business.timezone` |
| AS-7 | Online booking slots: **fixed 1-hour starts** on the hour; customer can book consecutive hours. | `booking.slot_minutes` = 60 |
| AS-8 | "Table idle too long" = table **free** for > 60 min during opening hours, or session **paused** > 15 min. | `alerts.idle_free_min`, `alerts.paused_min` |
| AS-9 | "Booked time ending" alert fires **10 min** before booked end (or before the 1-hour mark for walk-ins). | `alerts.ending_min` |
| AS-10 | Extra players do not change the price by default; optional fee per extra player (beyond 2) per hour per table type, default 0. Players count is used for split bill. | `billing.extra_player_fee` |
| AS-11 | Online booking: customer pays deposit by UPI to the venue's QR and submits the UTR; staff/admin verifies. No payment gateway. Unpaid requests expire after 30 min. | `booking.hold_minutes` = 30 |
| AS-12 | Staff attendance: tap check-in / check-out; admin can edit. | - |
| AS-13 | Expenses: simple log (date, category, amount, note). | - |

---

## 4. Layer model

Every feature is built through these layers. **A layer may only call the layer directly below it.**

| Layer | Name | What it is | Where in code | May call |
|---|---|---|---|---|
| **L1** | Page | Route-level component. Composes layout + components. No data logic. | `src/pages/**` | L2, L3 |
| **L2** | Component | UI pieces (buttons, sheets, tiles, forms). Local UI state only. Fires callbacks/hook mutations. | `src/components/**` | L3 |
| **L3** | Hook / Store | TanStack Query hooks (`useX`) for fetch + mutation, Zustand stores (cart, UI, offline status). Owns cache keys and invalidation. | `src/hooks/**`, `src/stores/**` | L4 |
| **L4** | Service | The **only** code that imports the Supabase client. One file per domain. Wraps queueable mutations with the offline queue (L8). | `src/services/**` | L5 / L8 |
| **L5** | RPC / Edge Function | Business logic in Postgres functions (`rpc_*`) and Edge Functions. Transactional, idempotent, role-checked. | `supabase/migrations`, `supabase/functions` | L6 |
| **L6** | Data | Tables, constraints, triggers, **Row Level Security**. | `supabase/migrations` | - |
| **L7** | Realtime | Supabase Realtime `postgres_changes` subscriptions that invalidate L3 caches so every device updates instantly. | `src/realtime/**` | L3 |
| **L8** | Offline queue | IndexedDB (Dexie) queue of pending mutations with client `op_id`; replays to L5 on reconnect. Sits between L4 and L5. | `src/offline/**` | L5 |

**Trace notation**: `L2 Button → L3 useX → L4 xService.fn → L5 rpc_x → L6 tables → L7 event → L3 invalidate → L2 re-render`.

---

## 5. Navigation and layout (summary; full wireframes in `TCN_DESIGN.md`)

- **Mobile (< 768px)**: top bar (title, alerts bell, avatar) → **content on top / main area** → **bottom nav bar** (5 tabs).
- **Tablet and desktop (>= 768px)**: **left sidebar** with the same 5 tabs (icon + label; collapsed rail at 768-1023, expanded at >= 1024) → **content on the right**. Top bar stays on the right side.
- Same shell (`AppShell`) for Admin and Staff; only tabs and routes differ.

### 5.1 Admin tabs (`/admin/*`)

| Tab | Route | Purpose |
|---|---|---|
| Home | `/admin` | KPIs for today, live table strip, alerts, pending approvals |
| Tables | `/admin/tables` | Live board; control sessions; table settings |
| Bookings | `/admin/bookings` | Calendar/list, online requests, deposits |
| Reports | `/admin/reports` | Revenue, utilization, peak hours, top items, profit, bill history |
| Manage | `/admin/manage/*` | Rates, menu, customers and plans, staff, attendance, expenses, settings, audit |

### 5.2 Staff tabs (`/staff/*`)

| Tab | Route | Purpose |
|---|---|---|
| Tables | `/staff/tables` (home) | Live board; start/pause/transfer/stop |
| Bookings | `/staff/bookings` | Today's slots, add booking, check-in, confirm deposit |
| Orders | `/staff/orders` | Cafe menu, cart, add to table / standalone |
| Bills | `/staff/bills` | Open bills, discount, UPI QR, payment, share |
| Me | `/staff/me` | Check in/out, shift summary (own counts, no revenue), logout |

### 5.3 Other routes
`/login` (staff PIN + owner Google), `/book` (public booking), `/book/status` (public status check), `/403`, `/404`.
Admin may open `/staff/*` (Manage › "Switch to staff view"). Staff cannot open `/admin/*` (route guard + RLS).

---

## 6. Business rules

### 6.1 Table status machine
`free → running → paused → running → free` (on stop). Also `maintenance` (admin only, only when no active session). Table status is derived from the active session; `game_tables.status` is a denormalized column updated only by RPCs.
Transitions: `rpc_start_session` (free→running), `rpc_pause_session` (running→paused), `rpc_resume_session` (paused→running), `rpc_stop_session` (running|paused→free), `rpc_transfer_session` (source→free, destination→running/paused).

### 6.2 Billing (authoritative on server; client shows live estimate)
1. Active time = (now or ended_at) − started_at − paused intervals, summed over all session segments (a transfer starts a new segment).
2. Billable time = max(active time, `billing.min_minutes`). After the first 60 min, round **up** to the next `block_minutes`.
3. Charge = sum over 15-min blocks of `rate_per_hour / 4`, where the rate is resolved **per block** from `rate_rules` using: table type, day type (weekday/weekend), time-of-day band, customer type (member/walk-in), highest priority wins.
4. Add optional extra-player fee, then add cafe items. Round the table charge to the nearest Rs 1.
5. Membership: a customer with an active membership on the bill date gets `member` rates.
6. Detailed algorithm: `TCN_TRD.md` §10.

### 6.3 Bookings
Status: `pending_deposit → pending_verification → confirmed → checked_in → completed`; also `cancelled`, `no_show`, `expired`.
- Staff-entered bookings (walk-in/phone): deposit is mandatory too; staff records UTR/cash and the booking goes straight to `confirmed` (staff action S-22 combined with S-20).
- Online: `pending_deposit` → customer submits UTR → `pending_verification` → admin/staff verifies → `confirmed`. Unverified after `booking.hold_minutes` → `expired` (Y-02).
- No double booking: a table-slot overlap is rejected by a DB exclusion constraint.
- Check-in starts a session linked to the booking (S-21 → S-04); deposit is credited on the bill.

### 6.4 Cafe orders
Fixed menu, no stock. An order belongs either to a **session** (added to the table's bill) or is **standalone** (immediate bill). Items can be edited until the bill is `paid`.

### 6.5 Bill
`bills.status`: `draft` (open, editable) → `paid` or `void` (admin only).
`total = table_charge + cafe_total − discount − loyalty_redeemed − deposit_applied`. If negative after deposit, the remainder is a refund due (shown to staff; recorded as a `bill_payments` row with negative amount, mode `cash`).
Payments: cash and UPI; **split bill** = multiple payment rows (by person or by mode) summing to total.

### 6.6 Discounts (Admin PIN)
Types: fixed Rs or percent, with a mandatory reason. Two ways to apply:
1. **PIN on device**: an admin types their approval PIN on the staff device → `rpc_apply_discount_with_pin`.
2. **Remote approval**: staff submits a request → admin gets a live alert on their phone → approves/rejects (A-03).
Both are written to `audit_log`. PIN attempts are rate-limited (5 wrong tries → 5 min lock).

### 6.7 Loyalty and membership
Points are earned on `paid` bills (on cash/UPI actually paid, excluding deposit-covered part). Redemption reduces the bill total and creates a ledger row. Membership = active plan period. Admin sells a plan (A-42); the sale creates a `bills` row with `kind='membership'`, so revenue reports include it.

### 6.8 Alerts
Generated by a pg_cron job every minute (Y-01): `booking_ending`, `table_idle`, `session_paused_long`, `deposit_pending`, `discount_request`. Shown in the top-bar bell (both panels per role), with sound/vibration option on running devices.

---

## 7. Action traces

Conventions: **Chain** = L2→L3→L4. **Backend** = L5 → L6 writes. **Reflects** = what updates and for whom (via L7). All mutations marked **Q** are queueable offline (L8).

### 7.1 Shared actions (used by Admin and Staff)

| ID | Control (screen › element) | Chain | Backend | Reflects |
|---|---|---|---|---|
| S-02 | Tables › free table tile | `TableTile.onPress` → opens `StartSessionSheet` (L2 only) | - | Sheet opens |
| S-03 | StartSessionSheet › customer search / New customer | `CustomerPicker` → `useCustomerSearch(q)` → `customersService.search(q)`; new: `useUpsertCustomer` → `customersService.upsert` | search: select `customers` (RLS). upsert: `rpc_upsert_customer(phone,name)` → `customers` | Picker list; selected customer shown with membership badge and points |
| S-04 | StartSessionSheet › **Start** | `useStartSession` → `sessionsService.start` **Q** | `rpc_start_session(op_id, table_id, customer_id, players, booking_id?)` → insert `sessions`, `session_segments`, create `orders` (empty), update `game_tables.status='running'`, if booking: `bookings.status='checked_in'` | All devices: tile turns Running with timer (from `started_at`); Admin Home strip updates; booking row shows Checked-in |
| S-05 | Tables › running/paused tile | opens `TableDetailSheet` (reads `useSession(id)`) | `sessions` select | Sheet shows timer, players, orders, live estimate |
| S-06 | TableDetail › **Pause** | `usePauseSession` → `sessionsService.pause` **Q** | `rpc_pause_session` → insert `session_pauses(paused_at)`, `sessions.status='paused'`, `game_tables.status='paused'` | Tile = Paused, timer frozen on all devices |
| S-07 | TableDetail › **Resume** | `useResumeSession` → `sessionsService.resume` **Q** | `rpc_resume_session` → close pause row, statuses back to running | Timer continues everywhere |
| S-08 | TableDetail › **Transfer** → pick free table | `useTransferSession` → `sessionsService.transfer` **Q** | `rpc_transfer_session(op_id, session_id, to_table_id)` → close current `session_segments`, open new one on destination (rate re-resolved at billing), update both `game_tables.status` | Source tile Free, destination Running; orders and timer move with session |
| S-09 | TableDetail › Players − / + | `useSetPlayers` → `sessionsService.setPlayers` **Q** | `rpc_set_players` → `sessions.players` | Count shown; used by Split bill |
| S-10 | TableDetail › **Add item** | opens menu picker → same as S-31 (target = this session) | see S-31 | Order list in sheet; bill estimate updates |
| S-11 | TableDetail › **Stop & bill** (confirm dialog) | `useStopSession` → `sessionsService.stop` **Q** | `rpc_stop_session` → close segment/pauses, `sessions.status='completed'`, `game_tables.status='free'`, upsert `bills(status='draft')` with computed table charge snapshot | Tile Free; new draft bill appears in Bills (all devices); staff is routed to `/staff/bills/:id` |
| S-20 | Bookings › **+ Booking** (walk-in/phone) | `BookingForm` → `useCreateBooking` → `bookingsService.create` | `rpc_create_booking(source, table_type|table_id, start, hours, customer, deposit_mode)` → insert `bookings` (overlap constraint), status `confirmed` when deposit recorded | Calendar/list updates on all devices; tile shows Reserved badge 15 min before start |
| S-21 | Bookings › booking row › **Check in** | `useStartSession` prefilled (booking, table, customer) | as S-04 | as S-04 |
| S-22 | Bookings › request row › **Verify deposit** (UTR + method) | `useConfirmDeposit` → `bookingsService.confirmDeposit` | `rpc_confirm_deposit(booking_id, utr, method)` → `bookings.deposit_status='verified'`, status `confirmed`, resolve `alerts(deposit_pending)` | Booking Confirmed everywhere; customer sees it on `/book/status` |
| S-23 | Bookings › row › **Cancel** | `useCancelBooking` → `bookingsService.cancel` | `rpc_cancel_booking(booking_id, reason)` → status `cancelled`; if `now <= start − refund_hours` set `refund_due=true` else `forfeited=true` | Slot freed; refund flag shown in booking row and on Bills |
| S-30 | Orders › item card + / − | `useCartStore.add/remove` (L3 store only) | - | Cart badge and total update |
| S-31 | Orders › cart › **Add to table** (pick running/paused table) | `useAddOrderItems` → `ordersService.addToSession` **Q** | `rpc_add_order_items(op_id, session_id, items[])` → insert `order_items` (price snapshot) | Table detail and bill estimate update everywhere |
| S-32 | Orders › cart › **Standalone sale** | `useCreateStandaloneOrder` → `ordersService.createStandalone` | `rpc_create_standalone_order(op_id, items[], customer?)` → `orders`, `order_items`, `bills(draft)` | Bill opens in `/…/bills/:id` |
| S-33 | Table detail or Bill › item qty − / remove | `useUpdateOrderItem` → `ordersService.updateItem` **Q** | `rpc_update_order_item(item_id, qty)` (qty 0 deletes; rejected if bill paid) | Totals update |
| S-40 | Bills › open bill row | `useBill(id)` → `billsService.get` → `rpc_calc_bill_preview(bill_id)` (recomputes, does not write) | reads | Bill detail with line items and total |
| S-41 | Bill › **Request discount** | `DiscountRequestForm` → `useRequestDiscount` → `discountsService.request` | `rpc_request_discount(bill_id,type,value,reason)` → `discount_requests(pending)` + `alerts(discount_request)` | Admin bell + Home pending list (A-03); staff sees "Waiting for approval" |
| S-42 | Bill › **Admin PIN** (admin types PIN) | `useApplyDiscountWithPin` → `discountsService.applyWithPin` (online only) | `rpc_apply_discount_with_pin(bill_id,type,value,reason,pin)` → verify bcrypt hash, rate-limit, write `bills.discount_*`, `audit_log` | Total recalculates; discount line shows approver |
| S-43 | Bill › **Show UPI QR** | `UpiQrDialog` builds `upi://pay?pa=<settings.upi_vpa>&pn=TCN&am=<due>&cu=INR&tn=<bill_no>` client-side (no backend) | - | Full-screen QR with amount |
| S-44 | Bill › **Payments** (add Cash/UPI rows, or **Split** into N) | `PaymentEditor` (local state); sum must equal due | - | Remaining amount shown live |
| S-45 | Bill › **Redeem points** toggle | local state, limited by `loyalty.max_redeem_pct` | - | Due recalculated |
| S-46 | Bill › **Share** (PDF / WhatsApp) | `useReceipt` builds PDF (client lib) and `wa.me/<phone>?text=` link | - | PDF downloads / WhatsApp opens |
| S-47 | Bill › **Mark paid** | `useFinalizeBill` → `billsService.finalize` | `rpc_finalize_bill(bill_id, payments[], redeem_points)` → validate sum, `bills.status='paid'`, insert `bill_payments`, `loyalty_ledger` (earn/redeem), apply deposit, `bookings.status='completed'` | Bill moves to Paid; admin reports include it; customer points update |
| S-50 | Me › **Check in** | `useAttendance` → `attendanceService.toggle` | `rpc_attendance_toggle()` → insert `attendance(check_in)` | Shift timer; visible in Admin › Attendance |
| S-51 | Me › **Check out** | same | closes open `attendance` row | Shift hours total |
| S-52 | Me › **Log out** | `authService.signOut` | Supabase Auth | Redirect `/login` |

### 7.2 Admin-only actions

| ID | Control | Chain | Backend | Reflects |
|---|---|---|---|---|
| A-01 | Home › table tile | router navigate `/admin/tables?focus=:id` | - | Tables tab opens focused tile |
| A-02 | Home/Bell › alert **Acknowledge** | `useAckAlert` → `alertsService.ack` | `update alerts set acked_by, acked_at` (RLS admin) | Bell count updates on all admin devices |
| A-03 | Home/Bell › discount request **Approve / Reject** | `useDecideDiscount` → `discountsService.decide` | `rpc_decide_discount(request_id, approve)` → request status; on approve write bill discount + `audit_log` | Staff bill screen updates live; staff toast |
| A-04 | Home/Bookings › pending deposit **Verify** | same as S-22 | same | same |
| A-05 | Home › range chips (Today / 7 days / 30 days) | local state → `useReport('daily_revenue', range)` → `reportsService.get` | `rpc_report_daily_revenue(from,to)` | KPI cards: revenue, sessions, cafe sales, utilization |
| A-16 | Tables › table › **Maintenance** toggle | `useSetTableStatus` → `tablesService.setMaintenance` | `rpc_set_table_maintenance(table_id, on)` → rejected if active session | Tile gray "Maintenance" on all devices; unavailable for booking |
| A-17 | Tables › **Edit table** (name, type, active) | `useUpdateTable` → `tablesService.update` | `update game_tables` (RLS admin) | Board updates |
| A-21 | Bookings › request **Approve / Reject** | `useDecideBooking` → `bookingsService.decide` | `rpc_decide_booking(id, approve, reason)` | Booking confirmed/cancelled everywhere |
| A-22 | Bookings › **Mark no-show** | `bookingsService.markNoShow` | `rpc_mark_no_show` → status `no_show`, deposit forfeited | Slot freed |
| A-30 | Reports › tab (Revenue / Utilization / Peak hours / Top items / Profit) + range | `useReport(kind, range)` → `reportsService.get` | `rpc_report_*` (admin-only, security definer) | Charts and tables |
| A-31 | Reports › **Export CSV** | client-side CSV from the loaded data | - | File download |
| A-32 | Reports › Bill history › row | `useBill(id)` | `rpc_calc_bill_preview` (read) | Bill detail dialog |
| A-33 | Bill detail › **Void bill** (reason) | `useVoidBill` → `billsService.void` | `rpc_void_bill(bill_id, reason)` → `bills.status='void'`, reverse loyalty, `audit_log` | Report totals exclude it |
| A-40 | Manage › Rates › add/edit/delete rule | `useRateRules` + `useUpsertRateRule` → `ratesService.upsert` | `insert/update rate_rules` (admin) | Used for next bill calc; running sessions use new rates at billing time |
| A-41 | Manage › Menu › add/edit item, availability toggle, category CRUD | `useMenu*` → `menuService.*` | `menu_categories`, `menu_items` (admin write) | Staff Orders list updates live |
| A-42 | Manage › Customers › view / edit / **Sell membership** / **Adjust points** | `useCustomer*`, `useSellMembership` → `customersService.sellMembership` | `rpc_sell_membership(customer_id, plan_id, payments[])` → `customer_memberships`, `bills(kind='membership', paid)`; `rpc_adjust_points(customer_id, delta, reason)` → `loyalty_ledger`, `audit_log` | Member badge appears; member rates apply |
| A-43 | Manage › Plans › CRUD | `usePlans*` → `plansService.*` | `membership_plans` | Plans list for selling |
| A-44 | Manage › Staff › **Create / Deactivate / Reset PIN** | `useCreateStaff` → `staffService.create` | Edge Function `admin-create-staff(username, name, pin)` (service role) → Auth user `username@tcn.local`, `profiles(role='staff')`; deactivate sets `profiles.active=false` | Staff can log in or is blocked on next request |
| A-45 | Manage › Attendance › edit entry | `useEditAttendance` → `attendanceService.edit` | `update attendance` + `audit_log` | Hours recalculated |
| A-46 | Manage › Expenses › add/edit/delete | `useExpenses*` → `expensesService.*` | `expenses` (admin only) | Profit report updates |
| A-47 | Manage › Settings › save | `useSaveSettings` → `settingsService.save` | `settings` key/value (admin) ; **Set approval PIN** → `rpc_set_admin_pin(pin)` (bcrypt) | Applies to rules/alerts immediately |
| A-48 | Manage › Audit log › filter | `useAudit(filters)` → `auditService.list` | select `audit_log` (admin) | Read-only list |
| A-49 | Manage › **Switch to staff view** | router navigate `/staff/tables` | - | Staff UI shell |
| A-50 | Avatar › **Log out** | `authService.signOut` | Auth | `/login` |

### 7.3 Public (customer) actions

| ID | Control | Chain | Backend | Reflects |
|---|---|---|---|---|
| P-01 | `/book` › pick date + game type | `useAvailability(date,type)` → `publicService.availability` | `rpc_public_availability(date,type)` (anon-callable; returns free hours per type only) | Slot grid |
| P-02 | Select slot(s) | local state | - | Summary with deposit amount |
| P-03 | **Request booking** (name, phone, captcha) | `useCreatePublicBooking` → `publicService.create` | Edge Function `public-booking-create` (verifies Turnstile, rate-limits per IP/phone) → `bookings(status='pending_deposit', source='online')`, returns `booking_code` + UPI deposit QR data | Confirmation card with QR and timer (`hold_minutes`) |
| P-04 | **I have paid** (UTR) | `publicService.submitUtr` | Edge Function `public-booking-submit-utr(code, phone, utr)` → status `pending_verification`, `alerts(deposit_pending)` | Staff and admin see it live (S-22 / A-04) |
| P-05 | `/book/status` (code + phone) | `publicService.status` | Edge Function `public-booking-status` | Shows Pending / Confirmed / Expired |

### 7.4 System jobs

| ID | Job | Behavior |
|---|---|---|
| Y-01 | pg_cron `fn_generate_alerts()` every minute | Creates `alerts` rows (deduplicated) per Section 6.8 |
| Y-02 | pg_cron `fn_expire_bookings()` every minute | `pending_deposit` older than `booking.hold_minutes` → `expired` |
| Y-03 | Client `RealtimeProvider` | Subscribes to channels (TRD §11), invalidates query caches, shows connection badge |
| Y-04 | Client `OfflineSync` | On reconnect, replays queue in order; shows "Syncing n changes" |

---

## 8. Cross-panel coordination (what talks to what)

| Event | Source | Seen by |
|---|---|---|
| Session started/paused/stopped | Staff phone | Admin Home strip, Admin Tables, every staff device (L7 on `game_tables`, `sessions`) |
| Discount requested | Staff | Admin bell + Home (alert + pending list) |
| Discount approved | Admin (remote) | Staff Bill screen (live), audit log |
| Online booking requested / UTR submitted | Customer | Staff Bookings badge + Admin bell |
| Menu or price changed | Admin | Staff Orders (live) |
| Rate rule changed | Admin | Next bill calculation (no push needed) |
| Table set to maintenance | Admin | All boards + public availability |
| Staff deactivated | Admin | Next request fails (RLS) → staff app shows "Account disabled" and signs out |

---

## 9. Offline behavior

| Works offline (queued **Q**) | Needs internet |
|---|---|
| Start/pause/resume/transfer/stop session, set players, add/edit order items, create standalone order draft | Discounts and PIN checks, mark paid, deposit verification, booking creation, all admin edits, reports, public page |
Offline banner is shown at the top ("Offline - changes will sync"). Timers keep running from the cached `started_at` with the last known server clock offset. Billing shown offline is an **estimate** (labelled); the server recomputes on sync.

---

## 10. Non-functional requirements

- **Performance**: board loads < 2 s on 4G; tile state change visible on other devices < 1.5 s.
- **Time**: all durations computed from server timestamps; client uses `serverOffset` from `rpc_now()`; never trust device clock for billing.
- **Security**: RLS on every table; staff cannot read revenue aggregates; PINs hashed (bcrypt via pgcrypto); public endpoints rate-limited + captcha; full `audit_log` for discounts, voids, price/rate edits, point adjustments, attendance edits.
- **Accessibility**: touch targets >= 44px; contrast per design doc; status never by color alone (icon + label).
- **Browsers**: latest Chrome/Android WebView, Safari iOS, desktop Chrome/Edge. PWA installable.
- **Cost**: must run on free tiers (Vercel Hobby, Supabase Free). No paid services in v1.

---

## 11. Acceptance criteria (v1 "done")

1. Staff can run a full cycle on a phone: start (with customer) → add cafe item → pause/resume → transfer → stop → bill → request discount → admin approves on another phone → UPI QR → split payment → mark paid → share WhatsApp/PDF.
2. Two devices show the same table state within 2 s; timers match.
3. Online booking: customer books, pays deposit, submits UTR; staff verifies; check-in starts a session; deposit appears on the bill.
4. Billing unit tests pass for: <1 h session, exactly 1 h, 1 h 07 m, pause intervals, transfer across peak/off-peak, member vs walk-in, weekend rule.
5. Staff accounts cannot read reports, expenses, or settings (verified by RLS tests).
6. Offline: start a session with the network off, reconnect, session exists once (idempotent).
7. Layout: bottom nav on < 768px, left sidebar on >= 768px; no horizontal scroll on 360px width.
