# TCN Operations Suite – Floor Command & Live Operations

The official enterprise operating system for **The Cue Nation** arena. Built for high-tempo floor stewards and management, providing real-time billiard session timing, synchronized café kitchen ticketing (KOT), customer loyalty tracking, and instant billing folios.

Designed with pixel-level adherence to Apple's Human Interface Guidelines (8pt layout system, SF Pro typography, glassmorphism material-depth, and fluid spring physics).

---

## System Overview

```
Floor Operations (Staff & Admin)
├── Floor Command & Live Operations (Active Dashboard)
├── Billiard Arena (Pool & Snooker Tables + Live Timers)
├── Café POS & Order Terminal
└── Kitchen Order Ticketing (KOT Live Board)

Management & Governance (Admin Only)
├── Customer CRM & Loyalty Tiers (VIP, Premium, Standard)
├── Billing Ledger & Invoice Folios
└── Shift Reconciliation & Revenue Auditing
```

---

## Key Features

1. **Floor Command & Live Operations**:
   - Real-time floor occupancy telemetry, active session count, and daily revenue metrics.
   - Top-down pool & snooker table representations with dynamic high-contrast status overlays (**TAKEN** in Apple Red `#FF3B30` vs **NOT TAKEN** in Apple Green `#34C759`).
   - 1-second interval timer calculation with automatic rate-per-hour billing and minimum minute threshold enforcement.

2. **Dual-Role Operational Workspaces**:
   - **Admin View (General Manager)**: Unrestricted access to floor management, financial revenue reports, customer discounts, and bill voiding.
   - **Staff View (Floor Steward)**: Focused, streamlined interface for table check-ins, table transfers, café order dispatch, and bill settlement.
   - Seamless live switching via top-bar Apple segmented controls.

3. **Integrated Billiard & Café Folios**:
   - Attach café food/drink items directly to an active table tab.
   - Settle table time and refreshments in a single consolidated GST-ready invoice receipt with print/download capability.

4. **Kitchen Order Tickets (KOT)**:
   - Dedicated low-latency KOT screen for kitchen chefs with priority orders and real-time status transitions (`Queued` → `Preparing` → `Ready for Dispatch`).

---

## Design System Specifications (Apple HIG)

- **Grid System**: Strict 8pt spatial grid (`8px`, `16px`, `24px`, `32px`, `48px`).
- **Touch Targets**: Minimum `44px` height on all interactive controls.
- **Corner Radii**:
  - Buttons & Inputs: `12px`
  - Cards & Modals: `20px`
  - Badges & Tags: `8px`
- **Typography**: Apple SF Pro (`SF Pro Display` for headlines, `SF Pro Text` for body, tabular figures for currency and timers).
- **Surface Elevation**: Multi-layered glassmorphism (`backdrop-blur-[20px] backdrop-saturate-[180%]`).

---

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```
Navigate to `http://localhost:5173/` in your browser.

### Production Build

```bash
npm run build
```
Generates a verified, zero-error production bundle in `dist/`.
