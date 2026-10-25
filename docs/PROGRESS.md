# TCN Build & Verification Progress

## Phase Overview & Status
- [x] **Phase 1: Foundation** (Completed) - tsc, eslint, vitest (12/12), build green
- [x] **Phase 2: Tables & Sessions** (Completed) - tsc, eslint, vitest (23/23), build green
- [x] **Phase 3: Orders & Bills** (Completed) - tsc, eslint, vitest (30/30), build green (6.80s)
- [x] **Phase 4: Discounts, Customers, Loyalty, Memberships** (Completed) - tsc, eslint, vitest (38/38), build green
- [x] **Phase 5: Bookings & Public Flow** (Completed) - tsc, eslint, vitest (48/48), build green (16.67s)
- [x] **Phase 6: Admin KPIs, Reports & Management** (Completed) - tsc, eslint, vitest (59/59), build green
- [x] **Phase 7: Offline & PWA** (Completed) - tsc, eslint, vitest (68/68), build green, PWA service worker generated
- [x] **Phase 8: Hardening & Final Acceptance** (Completed) - RLS 0010, cron 0011, realtime 0012, 4 Edge Functions, pgTAP suite, README & QA Checklist

---

## Trace Matrix & Status

| ID | Trace Name | Target Phase | Status | Evidence / Test |
|---|---|:---:|:---:|---|
| S-02 | Free table tile -> StartSessionSheet | Phase 2 | DONE | `TableTile.tsx` -> `StartSessionSheet.tsx`, `sessions.test.ts:starts a session on a free table` |
| S-03 | Customer picker search / upsert | Phase 2 | DONE | `customers.ts:upsert`, `useCustomerSearch`, `useUpsertCustomer` |
| S-04 | Start session (Q) | Phase 2 | DONE | `rpc_start_session`, `sessionsService.start`, `sessions.test.ts` |
| S-05 | Running/paused tile -> TableDetailSheet | Phase 2 | DONE | `TableTile.tsx` -> `TableDetailSheet.tsx` (hero timer, live billing) |
| S-06 | Pause session (Q) | Phase 2 | DONE | `rpc_pause_session`, `sessionsService.pause`, `sessions.test.ts:pauses and resumes` |
| S-07 | Resume session (Q) | Phase 2 | DONE | `rpc_resume_session`, `sessionsService.resume`, `sessions.test.ts:pauses and resumes` |
| S-08 | Transfer session (Q) | Phase 2 | DONE | `rpc_transfer_session`, `TransferModal.tsx`, `sessions.test.ts:transfers an active session` |
| S-09 | Set players count (Q) | Phase 2 | DONE | `rpc_set_players`, `useSetPlayers`, `sessions.test.ts:updates the players count` |
| S-10 | TableDetail -> Add item | Phase 3 | DONE | `TableDetailSheet.tsx` -> `/orders?sessionId=`, CartDrawer attached mode |
| S-11 | Stop & bill session (Q) | Phase 2 | DONE | `rpc_stop_session`, `TableDetailSheet.tsx` confirm dialog, `sessions.test.ts:stops a session` |
| S-20 | Create booking (+ Booking) | Phase 5 | DONE | `rpc_create_booking`, `bookingsService.create`, `BookingFormModal.tsx`, `bookings.test.ts:creates walk-in booking` |
| S-21 | Check in booking | Phase 5 | DONE | `StaffBookingsPage.tsx:handleCheckIn`, `StartSessionSheet.tsx`, `sessions.test.ts` |
| S-22 | Verify deposit | Phase 5 | DONE | `rpc_confirm_deposit`, `bookingsService.confirmDeposit`, `VerifyDepositModal.tsx`, `bookings.test.ts` |
| S-23 | Cancel booking | Phase 5 | DONE | `rpc_cancel_booking`, `CancelBookingModal.tsx`, `bookings.test.ts:cancels booking` (>2h refund, <2h forfeit) |
| S-30 | Cart add / remove | Phase 3 | DONE | `useCartStore`, `MenuItemCard.tsx`, `CartDrawer.tsx` |
| S-31 | Add order items to table (Q) | Phase 3 | DONE | `rpc_add_order_items`, `ordersService.addItems`, `orders.test.ts:adds order items to a session` |
| S-32 | Create standalone order | Phase 3 | DONE | `rpc_create_standalone_order`, `ordersService.createStandalone`, `orders.test.ts:creates standalone cafe order` |
| S-33 | Update order item qty (Q) | Phase 3 | DONE | `rpc_update_order_item`, `ordersService.updateItemQty`, `orders.test.ts:updates item quantity` |
| S-40 | Bill detail preview | Phase 3 | DONE | `rpc_calc_bill_preview`, `billsService.getPreview`, `BillPreviewSheet.tsx`, `bills.test.ts:calculates live bill preview` |
| S-41 | Request discount | Phase 4 | DONE | `rpc_request_discount`, `discountsService.requestDiscount`, `discounts.test.ts` |
| S-42 | Apply discount with Admin PIN | Phase 4 | DONE | `rpc_apply_discount_with_pin`, `discountsService.applyDiscountWithPin`, `discounts.test.ts` (with lockout) |
| S-43 | Show UPI QR | Phase 3 | DONE | `UpiQrDialog.tsx`, `lib/upi.ts:buildUpiUri` |
| S-44 | Payment rows & split bill | Phase 3 | DONE | `SplitPaymentRows.tsx`, `billsService.finalize`, `bills.test.ts:finalizes bill with split payments` |
| S-45 | Redeem points | Phase 4 | DONE | `rpc_adjust_points`, `CustomerDetailDrawer.tsx`, `discounts.test.ts` |
| S-46 | Share bill (PDF / WhatsApp) | Phase 3 | DONE | `lib/whatsapp.ts:buildWhatsAppReceiptUrl`, `BillPreviewSheet.tsx` WhatsApp trigger |
| S-47 | Finalize bill (mark paid) | Phase 3 | DONE | `rpc_finalize_bill`, `billsService.finalize`, `bills.test.ts:finalizes bill` |
| S-50 | Staff check-in | Phase 6 | DONE | `rpc_attendance_toggle`, `attendanceService.toggle`, `StaffMePage.tsx`, `admin.test.ts` |
| S-51 | Staff check-out | Phase 6 | DONE | `rpc_attendance_toggle`, `attendanceService.toggle`, `StaffMePage.tsx`, `admin.test.ts` |
| S-52 | Staff log out | Phase 1 | DONE | `src/services/auth.ts:signOut`, `useAuth` hook, Navbar/TopBar logout, `StaffMePage.tsx` |
| A-01 | Home table tile -> Tables navigate | Phase 6 | DONE | `AdminHomePage.tsx`, table tile strip click -> `/admin/tables` |
| A-02 | Alert acknowledge | Phase 5 | DONE | `rpc_ack_alert`, `alertsService.ackAlert`, `AlertsDialog.tsx`, `bookings.test.ts` |
| A-03 | Decide discount request | Phase 4 | DONE | `rpc_decide_discount`, `discountsService.decideDiscount`, `DiscountRequestsModal.tsx`, `discounts.test.ts` |
| A-04 | Verify pending deposit | Phase 5 | DONE | `rpc_confirm_deposit`, `AdminBookingsPage.tsx`, `VerifyDepositModal.tsx`, `bookings.test.ts` |
| A-05 | Revenue report range chips / KPIs | Phase 6 | DONE | `AdminHomePage.tsx`, `useDailyRevenue`, `useProfit`, `admin.test.ts` |
| A-16 | Set table maintenance | Phase 2 | DONE | `rpc_set_table_maintenance`, `MaintenanceModal.tsx`, `sessions.test.ts:toggles table maintenance` |
| A-17 | Edit table | Phase 2 | DONE | `tablesService.update`, `useUpdateTable`, `AdminTablesPage.tsx` |
| A-21 | Decide booking request | Phase 5 | DONE | `rpc_decide_booking`, `bookingsService.decideBooking`, `VerifyDepositModal.tsx`, `AdminBookingsPage.tsx` |
| A-22 | Mark booking no-show | Phase 5 | DONE | `rpc_mark_no_show`, `bookingsService.markNoShow`, `AdminBookingsPage.tsx`, `bookings.test.ts` |
| A-30 | Reports views | Phase 6 | DONE | `AdminReportsPage.tsx`, 6 tabs, `reportsService`, `admin.test.ts` |
| A-31 | Export report CSV | Phase 6 | DONE | `AdminReportsPage.tsx:handleExportCsv`, `src/pages/admin/AdminReportsPage.tsx` |
| A-32 | Bill history view | Phase 3 | DONE | `StaffBillsPage.tsx`, `billsService.getAll`, `AdminReportsPage.tsx` bills history |
| A-33 | Void bill | Phase 3 | DONE | `rpc_void_bill`, `VoidBillDialog.tsx`, `billsService.void`, `bills.test.ts:voids a bill` |
| A-40 | Manage rate rules | Phase 6 | DONE | `AdminManagePage.tsx`, `ratesService`, `validateCatchAllRateRules`, `admin.test.ts` |
| A-41 | Manage menu & categories | Phase 6 | DONE | `AdminManagePage.tsx`, `useUpsertMenuItem`, `useToggleItemAvailability`, `admin.test.ts` |
| A-42 | Sell membership & adjust points | Phase 4 | DONE | `rpc_sell_membership`, `rpc_adjust_points`, `MembershipSaleModal.tsx`, `memberships.test.ts` |
| A-43 | Manage membership plans | Phase 4 | DONE | `membershipsService.getPlans`, `AdminCustomersPage.tsx`, `memberships.test.ts` |
| A-44 | Manage staff & reset PIN | Phase 6 | DONE | `AdminManagePage.tsx`, `staffService`, `useStaffList`, `useCreateStaff`, `admin.test.ts` |
| A-45 | Edit attendance entry | Phase 6 | DONE | `AdminManagePage.tsx`, `attendanceService`, `useAllAttendance`, `useEditAttendance`, `admin.test.ts` |
| A-46 | Manage expenses | Phase 6 | DONE | `AdminManagePage.tsx`, `expensesService`, `useExpenses`, `useCreateExpense`, `admin.test.ts` |
| A-47 | Save settings & admin PIN | Phase 6 | DONE | `AdminManagePage.tsx`, `settingsService`, `useSettings`, `useSetAdminPin`, `admin.test.ts` |
| A-48 | Filter audit log | Phase 6 | DONE | `AdminManagePage.tsx`, `auditService`, `useAudit`, `admin.test.ts` |
| A-49 | Switch to staff view | Phase 6 | DONE | `AdminManagePage.tsx:handleSwitchToStaff` -> `/staff/tables` |
| A-50 | Admin log out | Phase 1 | DONE | `src/services/auth.ts:signOut`, `useAuth` hook, Navbar/TopBar logout |
| P-01 | Public date & game type availability | Phase 5 | DONE | `rpc_public_availability`, `publicService.getAvailability`, `PublicBookingPage.tsx`, `bookings.test.ts` |
| P-02 | Public slot selection | Phase 5 | DONE | `PublicBookingPage.tsx:handleSelectSlot` (1h blocks, disabled booked) |
| P-03 | Public request booking | Phase 5 | DONE | `rpc_create_booking(online)`, `publicService.createBooking`, `PublicBookingPage.tsx`, `bookings.test.ts` |
| P-04 | Public submit UTR | Phase 5 | DONE | `rpc_submit_public_utr`, `publicService.submitUtr`, `PublicBookingPage.tsx`, `PublicStatusPage.tsx`, `bookings.test.ts` |
| P-05 | Public check status | Phase 5 | DONE | `rpc_public_booking_status`, `publicService.getStatus`, `PublicStatusPage.tsx`, `bookings.test.ts` |
| Y-01 | System alert generation | Phase 5 | DONE | `fn_generate_alerts()`, `alertsService.generateAlerts`, `AlertsDialog.tsx` |
| Y-02 | Expire bookings job | Phase 5 | DONE | `fn_expire_bookings()`, `0008_rpc_bookings.sql` |
| Y-03 | Realtime channel subscriptions | Phase 7 | DONE | `src/services/realtime.ts:subscribeVenue`, `src/realtime/RealtimeProvider.tsx` |
| Y-04 | Offline queue replay on reconnect | Phase 7 | DONE | `src/offline/queue.ts`, `src/offline/sync.ts`, `src/offline/offline.test.ts:replays pending operations` |

---

## Acceptance Criteria Checklist (PRD Section 11)
- [x] 1. Full cycle on phone: start -> add cafe item -> pause/resume -> transfer -> stop -> bill -> discount request/approve -> UPI QR -> split payment -> paid -> share receipt (`sessions.test.ts`, `orders.test.ts`, `bills.test.ts`, `discounts.test.ts`, `UpiQrDialog.tsx`, `SplitPaymentRows.tsx`).
- [x] 2. Multi-device sync: table state reflects within 2s; timers match across devices (`src/services/realtime.ts:subscribeVenue`, `src/realtime/RealtimeProvider.tsx`, `useTicker.ts`).
- [x] 3. Online booking flow: customer booking, deposit, UTR, staff verify, check-in starts session, deposit applied to bill (`PublicBookingPage.tsx`, `bookings.test.ts`, `VerifyDepositModal.tsx`, `StartSessionSheet.tsx`).
- [x] 4. Billing test matrix passes (<1h, exactly 1h, 1h07m, pauses, peak/off-peak transfer, member vs walk-in, weekend) (`src/lib/billing.test.ts`, `supabase/tests/rls_and_billing.sql`).
- [x] 5. RLS security: staff cannot read reports, expenses, settings or audit (`supabase/migrations/0010_rls.sql`, `supabase/tests/rls_and_billing.sql:table_privs_are`).
- [x] 6. Offline idempotency: session started offline, synced once on reconnect (`src/offline/queue.ts`, `src/offline/sync.ts`, `src/offline/offline.test.ts:replays pending operations`, `rls_and_billing.sql:Idempotency`).
- [x] 7. Responsive UI: bottom nav <768px, sidebar >=768px; zero horizontal scroll at 360px; >=44px touch targets (`src/layouts/NavBar.tsx`, `src/layouts/TopBar.tsx`, `TCN_DESIGN.md`).
- [x] 8. Payment Gateway: manual_upi, mock_gateway (HMAC-SHA256 test checkout), razorpay (API shapes & fixtures), additive schema, Edge Functions, automated reconciliation cron (`0013_payments_schema.sql`, `0016_payments_rpcs.sql`, `payments.test.ts`).
- [x] 9. Real Customer Accounts: Email+Password, Google OAuth, RLS customer isolation, admin-claim hardening (@tcn.local reject), phone-claim pending review (`0014_customer_accounts.sql`, `0017_security_hardening_rls.sql`, `customerAuth.test.ts`).
- [x] 10. Auth Activity Audit: `auth_events` table, `rpc_log_auth_event`, identifier masking, Owner Security & Audit UI with CSV export, brute force detection `auth_suspicious` (`0015_auth_events_audit.sql`, `authAudit.test.ts`).

---

## Amendment Trace Matrix & Status (docs/TCN_ADDENDUM.md)

| ID | Trace Name | Target | Status | Evidence / Test |
|---|---|:---:|:---:|---|
| **PAY-01** | Create Payment Order | Part 1 | DONE | `rpc_create_payment_order()`, `paymentsService.createOrder()`, `payments.test.ts` |
| **PAY-02** | Verify & Capture Payment | Part 1 | DONE | `rpc_verify_and_capture_payment()`, `paymentsService.verifyPayment()`, `payments.test.ts` |
| **PAY-03** | Webhook Ingestion & Idempotency | Part 1 | DONE | `supabase/functions/payments-webhook/`, `mockGateway.ts:handleWebhook`, `payments.test.ts` |
| **PAY-04** | Refund Processing | Part 1 | DONE | `rpc_process_refund()`, `paymentsService.processRefund()`, `payments.test.ts` |
| **PAY-05** | Cron Reconciliation | Part 1 | DONE | `fn_reconcile_payments()`, `0016_payments_rpcs.sql` |
| **ACC-01** | Customer Registration (Email/Pass) | Part 2 | DONE | `customerAuthService.register()`, `RegisterPage.tsx`, `customerAuth.test.ts` |
| **ACC-02** | Customer Login & Session | Part 2 | DONE | `customerAuthService.login()`, `CustomerLoginPage.tsx`, `customerAuth.test.ts` |
| **ACC-03** | Google OAuth Flow | Part 2 | DONE | `customerAuthService.loginWithGoogle()`, Supabase Google provider integration |
| **ACC-04** | Forgot / Reset Password | Part 2 | DONE | `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `customerAuth.test.ts` |
| **ACC-05** | Customer Bookings & Self-Service | Part 2 | DONE | `AccountBookingsPage.tsx`, `AccountProfilePage.tsx`, `customerAuth.test.ts` |
| **ACC-06** | Booking Draft Resume after Login | Part 2 | DONE | `PublicBookingPage.tsx` state preservation redirect and auto-fill |
| **SEC-01** | Role Escalation & Isolation | Part 2/3 | DONE | `fn_is_customer()`, `fn_is_staff_or_admin()`, `guards.tsx`, `0017_security_hardening_rls.sql` |
| **SEC-02** | Admin Claim Hardening | Part 2 | DONE | `rpc_claim_profile()` requires Google verified identity; rejects `@tcn.local` customer registration |
| **SEC-03** | Phone Link Hardening | Part 2 | DONE | Unlinked record with prior points/bills assigned `link_status='pending_review'`; admin approval in Security & Audit |
| **SEC-04** | Auth Activity Audit & Brute Force | Part 3 | DONE | `rpc_log_auth_event()`, `authAuditService`, `AdminSecurityAuditPage.tsx`, `authAudit.test.ts` |

---

## Automated vs Manual Verification Summary

### Automated Verification (100% Green)
- **Unit, Integration & E2E DOM Walkthrough Tests**: 16 test files, 102 passing tests (`npm test`).
  - `src/pages/e2e-walkthrough.test.tsx` (6 tests): Customer navbar branding & public CTAs, hosted checkout simulator with HMAC-SHA256 signature verification, decline/failure simulation, customer registration flow, admin payment operations ledger & provider switch, owner security audit metrics & masked access log.
  - `src/services/payments/payments.test.ts` (12 tests): Provider registry, mock gateway HMAC signing & verification, tampered signature rejection, Razorpay checkout options, raw webhook body signature verification, status normalization, payments service order lifecycle, and refund processing.
  - `src/services/customerAuth.test.ts` (8 tests): Registration, role enforcement (`customer`), rejection of `@tcn.local`, event logging, login/logout, password reset request/update, and booking isolation.
  - `src/services/authAudit.test.ts` (8 tests): Identifier masking (emails, phone numbers, anonymous), event logging, method filtering, search filtering, active sessions summary, and sanitized CSV export.
  - Existing operational suites (68 tests): bookings, admin, offline, discounts, sessions, bills, billing, orders, memberships, money, schemas, time.
- **Type Checking**: `npx tsc --noEmit` exited with code 0 (0 errors).
- **Code Quality**: `npm run lint` exited with code 0 (0 errors, 0 warnings).
- **Production Build**: `npm run build` completed in 14.23s, generating optimized PWA chunks and Workbox service worker.

### Manual Verification Guide (Google OAuth & Inbucket)
1. **Google OAuth Verification**:
   - In Supabase local / cloud console: Configure Google Client ID and Secret under **Auth > Providers > Google**.
   - Navigate to `http://localhost:5173/account/login` or `/account/register`.
   - Click "Continue with Google".
   - Confirm redirection to Google consent screen, then back to `/account`.
   - Verify `profiles.role` is set to `customer` and auth event `google_login` appears in **Admin > Manage > Security & Audit**.
2. **Inbucket Local Email Password Reset**:
   - In development with Supabase running locally, open `http://localhost:54324`.
   - Request password reset on `http://localhost:5173/account/forgot-password`.
   - Check Inbucket inbox, open the password reset email, click the link, and enter a new password.
   - Confirm login with the new password.

---

## Razorpay Go-Live Checklist
- [ ] Complete business verification & KYC on Razorpay Dashboard.
- [ ] Generate Live Key ID and Key Secret.
- [ ] Set Supabase Edge Function secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
- [ ] Add Webhook URL `https://<supabase-project>.supabase.co/functions/v1/payments-webhook` in Razorpay with events `payment.captured`, `payment.failed`, `refund.processed`.
- [ ] Set `payments.provider` = `razorpay` and `payments.mode` = `live` in Admin > Manage > Settings > Payments.
- [ ] Execute test deposit transaction (₹100) and verify instant capture and ticket confirmation.

