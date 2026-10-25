---
name: TCN – The Cue Nation
based_on: Zoom design system (DESIGN.md supplied by owner)
colors:
  primary: "#00053D"
  accent: "#0B5CFF"
  surface: "#FFFFFF"
  background: "#F2F8FF"
  error: "#DA1639"
typography:
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
rounded:
  md: 12px
---

# TCN Design System and UI Layouts

Companion to `TCN_PRD.md` and `TCN_TRD.md`. This system is derived from the supplied **Zoom** design system (navy foundation, electric-blue actions, 12px radius, 8px grid). Where TCN needs something Zoom does not define, it is marked **TCN extension**.

---

## 1. Principles

1. **Phone-first.** Design at 360-390px, then scale up. Staff operate with one hand, in a dim room, often with wet or busy hands.
2. **One primary action per view.** Electric Blue is for the main action only.
3. **State at a glance.** Table status must be readable from across the counter: big timer, status color + icon + label.
4. **Touch targets >= 44px** (override Zoom's 36-40px buttons on touch devices). 8px minimum between targets.
5. **Never color alone.** Status = color + icon + text.
6. **Calm density.** Whitespace on 8px grid; cards over dense tables on mobile.

---

## 2. Design tokens

### 2.1 Colors (from Zoom, plus TCN extension)

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#00053D` | Primary text, headings, dark cards, nav active icon bg |
| `--navy-2` | `#232333` | Secondary text |
| `--gray-text` | `#686F79` | Muted text, placeholders |
| `--gray-line` | `#DFE3E8` | Borders, dividers |
| `--blue` | `#0B5CFF` | Primary buttons, links, active nav |
| `--blue-hover` | `#0D6BDE` | Hover |
| `--blue-press` | `#085CFF` | Active/pressed |
| `--blue-sky` | `#4B96F1` | Input border (default) |
| `--blue-tint` | `#E6F0FF` | Selected/hover fills |
| `--bg-pale` | `#F2F8FF` | **App background**, info cards |
| `--white` | `#FFFFFF` | Cards, sheets |
| `--error` | `#DA1639` | Errors, destructive, over-time |
| `--error-bg` | `rgba(218,22,57,0.08)` | Error tint |

**TCN extension: table and state colors** (needed because Zoom has no multi-state palette; keep tints light, text dark):

| State | Fill | Border/Icon | Text | Icon (lucide) |
|---|---|---|---|---|
| Free | `#E8F7EE` | `#1E9E5A` | `#0B5132` | `CircleCheck` |
| Running | `#E6F0FF` | `#0B5CFF` | `#00053D` | `Play` |
| Paused | `#FFF4DB` | `#D98E04` | `#6B4500` | `Pause` |
| Reserved soon | `#F1EAFE` | `#7A4BE0` | `#3E1F8F` | `CalendarClock` |
| Maintenance | `#EEF0F3` | `#8A919C` | `#3A3F47` | `Wrench` |
| Warning (time ending) | `#FFF4DB` | `#D98E04` | `#6B4500` | `TimerReset` |
| Success (paid) | `#E8F7EE` | `#1E9E5A` | `#0B5132` | `BadgeCheck` |

Rules: Error Red is **never** a large fill (Zoom rule). Free-green and warning-amber are used only for status chips/tile borders, not buttons.

### 2.2 CSS variables (`src/styles/index.css`) and Tailwind mapping

```css
:root {
  --background: 210 100% 97%;      /* #F2F8FF */
  --foreground: 235 100% 12%;      /* #00053D */
  --card: 0 0% 100%;
  --card-foreground: 235 100% 12%;
  --primary: 220 100% 52%;         /* #0B5CFF */
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 100%;
  --secondary-foreground: 235 100% 12%;
  --muted: 210 100% 97%;
  --muted-foreground: 215 8% 43%;  /* #686F79 */
  --accent: 216 100% 95%;          /* #E6F0FF */
  --accent-foreground: 220 100% 52%;
  --destructive: 348 80% 47%;      /* #DA1639 */
  --border: 213 18% 90%;           /* #DFE3E8 */
  --input: 213 87% 63%;            /* #4B96F1 */
  --ring: 220 100% 52%;
  --radius: 0.75rem;               /* 12px */
  --nav-h: 64px;                   /* bottom bar height (+ safe-area) */
  --topbar-h: 56px;
  --sidebar-w: 240px;              /* >= 1024px */
  --sidebar-w-rail: 72px;          /* 768-1023px */
}
```
Tailwind: extend `colors` to read these (`hsl(var(--primary))` shadcn pattern), `borderRadius: { lg: 'var(--radius)', md: '8px', sm: '4px', xl: '20px' }`, `fontFamily: { sans: ['Inter', ...fallbacks], display: ['"Plus Jakarta Sans"', ...fallbacks] }`, extra `boxShadow` tokens below, and `screens: { md: '768px', lg: '1024px', xl: '1280px' }`. Add `status.{free,running,paused,reserved,maintenance}` color groups from 2.1.

### 2.3 Typography

Zoom's fonts (Almaden Sans, Happy Display) are proprietary and **must not be used**. Substitutes (Google Fonts, free): **Inter** (body/UI) and **Plus Jakarta Sans** (display/headings, 600-700). Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`. Use `font-variant-numeric: tabular-nums` for all timers, prices, and table columns.

| Role | Font | Mobile | Desktop | Weight | Line height |
|---|---|---|---|---|---|
| Display (KPI numbers, big timer) | Plus Jakarta Sans | 28 | 32-40 | 600 | 1.2 |
| H1 (page title) | Plus Jakarta Sans | 20 | 24 | 600 | 1.2 |
| H2 (section) | Plus Jakarta Sans | 16 | 20 | 600 | 1.2 |
| Body | Inter | 14 | 16 | 400 | 1.4 |
| Body strong / labels | Inter | 14 | 14-16 | 600 | 1.2 |
| Small / caption | Inter | 12 | 12-14 | 400 | 1.4 |
| Button | Inter | 14 | 14 | 500 | 1.2 |

Navy `#00053D` for text with weight >= 500 on light backgrounds; muted gray only for secondary info.

### 2.4 Spacing, radius, elevation, motion

- **Spacing** multiples of 4/8: 4, 8, 12, 16, 20, 24, 32, 40. Page padding: 16 (mobile), 24 (>=768), 32 (>=1280). Card gap 12 (mobile) / 16-24 (desktop). Max content width 1280 (centered).
- **Radius**: 12px (buttons, inputs, cards, tiles), 8px (info cards, chips inside cards, dropdown items), 20px (sheets top corners `20 20 0 0`), full for avatars/dots. Never > 20px except full circles.
- **Elevation**: Flat (none) for most; `shadow-sm: 0 2px 8px rgba(0,0,0,0.05)` top bar / bottom nav; `shadow-card: 0 5px 15px rgba(0,0,0,0.10)` cards (use **border `#DFE3E8` + shadow-sm** on mobile to stay light); `shadow-pop: 0 5px 15px rgba(0,0,0,0.20)` pressed button/menus; modals use `0 50px 100px 10px rgba(0,0,0,0.30)` on desktop only. Max 3 visible elevation levels.
- **Motion**: 150ms ease-out for press/hover, 220ms for sheets/dialogs, no decorative animation. Running-timer colon does **not** blink. Respect `prefers-reduced-motion`.
- **Z-index**: content 1, cards 2, popovers 5, top bar/nav 10, FAB 11, sheets/dialogs 20-22, blocking overlays 30, toasts 40.

---

## 3. Components

All built on shadcn/ui primitives, restyled with the tokens above.

### 3.1 Buttons (height 44px mobile and desktop; 36px allowed only for dense desktop toolbars)
- **Primary**: bg `#0B5CFF`, text white, radius 12, 14/500. Hover `#0D6BDE`, pressed `#085CFF` + `shadow-pop`. Disabled: 50% bg, `cursor-not-allowed` (keep enabled when possible and explain on tap).
- **Secondary**: white bg, navy text, 1px `#DFE3E8`. Hover bg `#F2F8FF` + border `#0D6BDE`.
- **Ghost**: transparent; hover bg `rgba(11,92,255,0.1)`, text blue.
- **Destructive**: white bg, text `#DA1639`, 1px `#DA1639` (never solid red fill). Confirm in a dialog.
- **Icon button**: 44x44, radius 12.
- **Link**: blue text, underline on hover.
- Max one Primary per view/sheet. Full-width stacked on mobile in sheets; side-by-side (secondary left, primary right) on desktop dialogs.

### 3.2 Inputs
Text input: height 44, radius 12, 1px `#4B96F1`, placeholder `#686F79`. Focus: border `#0B5CFF` + `0 0 0 3px rgba(11,92,255,0.1)`. Error: border `#DA1639`, bg `rgba(218,22,57,0.05)`, message below with icon. Search input: bg `#F3F8FF`, left icon, no border until focus. PIN input: 6 large circular digit boxes, numeric keypad (`inputMode="numeric"`), masked. Quantity stepper: [-] n [+] with 44px buttons.

### 3.3 Cards
Standard card: white, radius 12, padding 16 (mobile) / 24 (desktop), 1px `#DFE3E8`, `shadow-sm`. Info card: bg `#F2F8FF`, 1px `#E6F0FF`, radius 8, padding 16. Dark card (e.g., KPI hero): bg `#00053D`, white text, no border/shadow.

### 3.4 Badges / chips
Height 24, padding 6x12, radius 12, 12/500. Variants: primary (blue fill), secondary (`#E6F0FF` bg, blue text, blue border), status chips per 2.1 (fill tint + border + dark text + icon), error (tint + border). Counter badge on nav icons: 18px circle, `#DA1639` fill is allowed here (small element) with white text.

### 3.5 Table tile (`TableTile`) - the core component
Size: mobile 2-column grid, tile min-height 132; >=768: 3-column; >=1280: 6 tiles in a single row or 3x2.
Content (top to bottom): name ("Pool 1") + type icon, status chip, **timer** (Display, tabular) when running/paused, customer name (truncate), footer chips (players, cafe total badge, "Booked 7:00 PM" when reserved soon).
Left 4px accent bar and 1px border in the status border color; fill = status fill. Tap target = whole tile. Free tile shows "Start" affordance (plus icon).
Ending-soon: chip `TimerReset` "10 min left" in warning style; timer text turns `#DA1639` after planned time.

### 3.6 Bottom sheet / dialog (`ResponsiveModal`)
Mobile: bottom sheet, radius `20 20 0 0`, drag handle, max-height 90vh, sticky footer with actions, safe-area padding. >=768: centered dialog max-width 480 (forms) / 640 (bill), radius 12, backdrop `rgba(0,0,0,0.5)`.

### 3.7 Navigation (`NavBar`) - see section 4
Bottom bar item: icon 24 + label 12, min touch 64x56. Active: icon and label `#0B5CFF`, pill bg `#E6F0FF` behind icon. Inactive: `#686F79`. Sidebar item (>=768): 48px high, radius 12, icon + label (label hidden in rail mode <1024), active bg `#E6F0FF` + blue text + 3px left border `#0B5CFF`.

### 3.8 Others
- **Toast**: bottom center on mobile (above nav), top-right on desktop; success/error/info with icon; 4 s.
- **Offline banner**: full-width under top bar, bg `#FFF4DB`, text `#6B4500`, icon `WifiOff`, "Offline - n changes waiting to sync".
- **Skeletons**: `#E6F0FF` pulse. **Empty states**: icon, headline (sentence case, no period), one-line body, one verb CTA.
- **Alerts bell**: top bar, counter badge; opens popover (desktop) / sheet (mobile) listing alerts with Acknowledge.
- **Bill line**: label left, amount right (tabular), indented discount/deposit lines in muted text; total row in H2.
- **Charts** (Recharts): single blue `#0B5CFF` series, secondary `#4B96F1`, grid `#DFE3E8`, tooltips white card; always provide a table/CSV alternative.

### 3.9 Icons
`lucide-react`, 24px (nav), 20px (buttons), 16px (chips), stroke 1.75. Nav icons: Home `House`, Tables `LayoutGrid`, Bookings `CalendarDays`, Reports `ChartColumn`, Manage `SlidersHorizontal`, Orders `Coffee`, Bills `Receipt`, Me `UserRound`, Alerts `Bell`.

---

## 4. App shell and responsive behavior

Same `AppShell` for Admin and Staff. Breakpoints: **Mobile < 768**, **Tablet 768-1023**, **Desktop >= 1024**.

```
MOBILE (<768)                         TABLET (768-1023)                  DESKTOP (>=1024)
┌───────────────────────┐             ┌────┬──────────────────────┐      ┌──────────┬──────────────────────────┐
│ TopBar: title  🔔 (A) │             │ ▣  │ TopBar: title 🔔 (A) │      │ TCN logo │ TopBar: title    🔔  (A) │
├───────────────────────┤             │ ▦  ├──────────────────────┤      │ ▣ Home   ├──────────────────────────┤
│                       │             │ ▤  │                      │      │ ▦ Tables │                          │
│   CONTENT (details)   │             │ ▥  │   CONTENT (details)  │      │ ▤ Book.. │      CONTENT (details)   │
│   scrolls             │             │ ⚙  │   scrolls            │      │ ▥ Report │      max-w 1280          │
│                       │             │rail│                      │      │ ⚙ Manage │                          │
├───────────────────────┤             │72px│                      │      │ 240px    │                          │
│ ▣   ▦   ▤   ▥   ⚙     │ 64px+safe   └────┴──────────────────────┘      └──────────┴──────────────────────────┘
└───────────────────────┘ BottomNav
```

Rules:
- `<768`: `TopBar` fixed top (56px), content scrolls between, `BottomNav` fixed bottom (64px + `env(safe-area-inset-bottom)`); content has bottom padding to clear it. Max 5 tabs.
- `>=768`: `BottomNav` is **not rendered**; the **same 5 items render as a left sidebar** (rail with icons+tooltips at 768-1023, expanded with labels at >=1024); content fills the right side; `TopBar` spans the content column. Sidebar footer: avatar, role, "Switch to staff view" (admin), logout. Sidebar logo top: "TCN - The Cue Nation".
- One source of truth: `NavBar` reads a `tabs[]` config (icon, label, route, roles) and renders as bottom or sidebar using CSS breakpoints; no duplicate route logic.
- Modals: sheet on mobile, dialog on >=768. Lists: cards on mobile, data tables on >= 1024 (Reports, Customers, Audit).
- Orientation: counter tablet landscape uses rail sidebar + 3-column tile grid.

---

## 5. Screen layouts

Notation: `[ ]` button, `( )` chip, `▢` tile/card. Mobile shown unless noted; desktop notes follow each.

### 5.1 Login `/login`
```
TCN - The Cue Nation (logo, navy)
[ Staff ] [ Owner ]     (segmented)
Staff: Username [________]
       PIN      ● ● ● ○ ○ ○   (numeric keypad)
       [ Log in ]  (primary)
Owner: [ Continue with Google ]
```
Desktop: centered card 400px on `#F2F8FF`.

### 5.2 Staff › Tables (home) `/staff/tables`
```
TopBar: Tables                          🔔 (JS)
(All) (Pool) (Snooker)       ← filter chips
┌────────────┐ ┌────────────┐
│ Pool 1     │ │ Pool 2     │
│ (Running)  │ │ (Free)     │
│ 00:42:10   │ │  + Start   │
│ Rahul · 2p │ │            │
│ ☕ Rs 120  │ │            │
└────────────┘ └────────────┘
... 6 tiles, 2 columns
[BottomNav: Tables | Bookings | Orders | Bills | Me]
```
Tap free tile → **StartSessionSheet**; running/paused → **TableDetailSheet**. Desktop: 3-column grid (6 tiles in 2 rows), sheets become dialogs.

**StartSessionSheet**: Table name header; Customer search input (phone/name) with results list + `[ + New customer ]` (name, phone); optional "From booking" select (today's confirmed bookings for this table); Players stepper (default 1); `[ Start session ]` primary.

**TableDetailSheet**: header (table, status chip, customer + membership chip); Big timer (Display) + "Started 6:12 PM"; Live estimate card ("Table so far Rs 240 · estimate"); Players stepper; Orders list (item, qty stepper, amount) + `[ + Add item ]`; Actions row: `[ Pause/Resume ]` `[ Transfer ]`; footer: `[ Stop & bill ]` primary (confirm dialog). Desktop dialog: two columns (left timer/actions, right orders).

### 5.3 Staff › Bookings `/staff/bookings`
```
TopBar: Bookings      [ + Booking ]
(Today) (Tomorrow) (Pending 2)  ← segmented
Timeline/list grouped by hour:
┌──────────────────────────────┐
│ 7:00 PM · Snooker 2 · 1h      │
│ Amit · 98xxxxxx12            │
│ (Confirmed) deposit Rs 100 ✓ │
│ [ Check in ]                 │
└──────────────────────────────┘
Pending request card: (Verify deposit) UTR … [ Verify ] [ Reject ]
```
Booking form (sheet): game type chips, table (auto/pick), date, start hour, hours stepper, name, phone, deposit (mode Cash/UPI + UTR), `[ Save booking ]`. Desktop: left day list + right 6-table x hour grid (columns tables, rows hours).

### 5.4 Staff › Orders `/staff/orders`
```
Search [_______]  (All)(Snacks)(Drinks)(Meals)
┌────────┐ ┌────────┐   item cards: name, price, [-] n [+]
Sticky cart bar:  🛒 3 items · Rs 180   [ Add to table ▾ ] [ Sell now ]
```
Desktop: menu grid left (3-4 columns), cart panel right (sticky, 360px).

### 5.5 Staff › Bills `/staff/bills`
List: (Open) (Paid today) tabs; bill cards: Bill #, source ("Pool 1" / "Counter"), amount, status chip.
**Bill detail** `/staff/bills/:id`:
```
Bill #1042 · Pool 1 · Rahul (Member)  (Draft)
Table time 1h 15m                  Rs 300
  ├ 6:00-7:00 PM  off-peak ...     Rs 240   (breakdown, collapsible)
Cafe: Cold coffee x2               Rs 120
Discount (approved by Owner)      − Rs 30
Points redeemed (30)              − Rs 30
Deposit applied                   − Rs 100
─────────────────────────────────────────
Total due                           Rs 260
[ Request discount ]  [ Admin PIN ]      (secondary)
Payments: [ Cash ▾ Rs 100 ] [ UPI ▾ Rs 160 ]  [ + Add ] [ Split equally ▾ ]
[ Show UPI QR ] (secondary)   [ Share ▾ PDF | WhatsApp ]
[ Mark paid ]  (primary, enabled when payments = due)
```
Desktop: two columns (bill left, payments + actions right). UPI QR opens a full-screen dialog (white, QR 280px, amount large, "Scan to pay").
**Discount PIN modal**: type (Rs / %), value, reason (required), then admin enters 6-digit PIN; error "Wrong PIN. 2 tries left". **Request** variant: "Request sent. Waiting for owner" with live status.

### 5.6 Staff › Me `/staff/me`
Avatar, name; shift card ("Checked in 10:02 AM · 3h 20m") with `[ Check out ]`/`[ Check in ]`; today's counts (sessions started, bills collected - **no revenue**); Change PIN; `[ Log out ]`.

### 5.7 Admin › Home `/admin`
```
Greeting + date                              🔔
Dark KPI card:  Today's revenue  Rs 12,450   (+8% vs last Sat)
KPI row (2x2 mobile / 4x1 desktop): Sessions 18 · Cafe Rs 3,200 · Utilization 64% · Expenses Rs 800
Live tables strip: ▢ P1 00:42  ▢ P2 Free ▢ P3 ... (6 mini tiles, tap → Tables)
Needs attention:  (2) Discount requests  [Approve][Reject]
                  (1) Deposit to verify  [Verify]
                  (!) Pool 3 idle 70 min  [Ack]
Range chips: (Today)(7 days)(30 days)
Revenue mini-chart (bars)
```
Desktop: KPI row full width; below: left column "Needs attention", right column live tables + chart.

### 5.8 Admin › Tables `/admin/tables`
Same board as staff, plus per-tile overflow menu: Maintenance toggle, Edit table. Header button `[ Add table ]`. Admin can open TableDetailSheet with the same actions as staff.

### 5.9 Admin › Bookings `/admin/bookings`
Same as staff Bookings plus: Pending tab shows online requests with `[ Approve ]` `[ Reject ]`, `[ Mark no-show ]`, filter by status/date, search by phone/code. Desktop: grid view by table x hour.

### 5.10 Admin › Reports `/admin/reports`
Top: range selector (Today, 7d, 30d, custom). Tabs (scrollable chips): **Revenue · Utilization · Peak hours · Top items · Profit · Bills**.
- Revenue: stacked bars (table, cafe, membership) + table by day.
- Utilization: horizontal bars per table (% active).
- Peak hours: heatmap (day x hour), tooltip with minutes and revenue.
- Top items: ranked list with qty and revenue.
- Profit: revenue − expenses line/bars + category breakdown.
- Bills: searchable list; row opens bill detail with `[ Void bill ]` (destructive, reason).
Each tab: `[ Export CSV ]`. Desktop: chart left (2/3), summary + table right (1/3).

### 5.11 Admin › Manage `/admin/manage`
Mobile: grouped list of cards (icon, title, one-line description) → sub-pages with back arrow. Desktop: secondary left menu inside content (Rates, Menu, Customers, Plans, Staff, Attendance, Expenses, Settings, Audit).
- **Rates**: rule list grouped by table type; rule form (type, day, customer, from-to time, rate/hr, priority); warning banner if a type lacks a catch-all rule.
- **Menu**: categories chips + item list with availability switch; item form.
- **Customers**: search; detail (points, memberships, history); `[ Sell membership ]`, `[ Adjust points ]`.
- **Plans**: list + form (name, price, days).
- **Staff**: list (name, username, active switch, last login); `[ Add staff ]` (name, username, PIN), `[ Reset PIN ]`.
- **Attendance**: date range, per-staff entries, edit.
- **Expenses**: date, category, amount, note; monthly total.
- **Settings**: Venue (name, hours, weekend days), UPI VPA, Deposit (amount, refund window), Billing (block minutes, minimum), Loyalty, Alerts thresholds + sound, Approval PIN, Branding.
- **Audit**: filterable table (actor, action, entity, time), expandable before/after.

### 5.12 Public booking `/book` (no nav)
```
TCN - The Cue Nation        (hero strip, navy)
1 Choose: (Pool) (Snooker)   Date [ Today ▾ ]
2 Pick time: grid of hour chips (disabled = booked)
3 Your details: Name, Phone, captcha
Summary card: Snooker · 7-8 PM · Deposit Rs 100
[ Request booking ]
→ Step 2: UPI QR + amount + hold countdown (30:00)
  UTR [____________]  [ I have paid ]
→ Step 3: "Request received" + booking code + [ Check status ]
```
Single column max-width 480, centered on desktop.

---

## 6. States, content, and patterns

- **Loading**: skeletons matching layout. **Empty**: e.g. "No bookings today" + `[ Add booking ]`. **Error**: one sentence + `[ Retry ]`, no raw errors.
- **Copy**: sentence case; verb-first buttons ("Start session", "Mark paid"); no "please", no exclamation marks; contractions fine. Currency format: `Rs 1,250` (en-IN grouping); durations `1h 15m`; timers `HH:MM:SS`.
- **Confirmations**: destructive/irreversible actions (Stop & bill, Void bill, Cancel booking, Deactivate staff) use a dialog with a clear verb and consequences.
- **Realtime feedback**: when another device changes something, update silently; if it affects the open sheet (e.g., table stopped elsewhere), show an inline notice "This table was stopped by Priya" and refresh.
- **Sound/vibration** for alerts: optional, off by default, setting in Manage › Settings.
- **Dark mode**: out of scope for v1 (light theme only).

## 7. Do and don't

Do: navy text on light surfaces; blue only for the main action and active nav; 12px radius on interactive elements; 8px spacing grid; 44px touch targets; tabular numbers for money and time; status = color + icon + label.
Don't: use Zoom's proprietary fonts; use red as a large fill; add colors outside this file; stack more than 3 elevation levels; put a primary button in every card; rely on hover (touch first); hide critical actions in overflow menus on the Tables screen (Pause/Resume/Stop must be one tap from the sheet).

## 8. Accessibility checklist
Contrast AA (navy on white is AAA); focus ring `0 0 0 3px rgba(11,92,255,0.1)` + 1px blue border; labels on all inputs; `aria-live="polite"` for toasts and timer-ending alerts (timers themselves are not announced every second); keyboard navigation on desktop (tab order: sidebar → top bar → content); `prefers-reduced-motion` honored.
