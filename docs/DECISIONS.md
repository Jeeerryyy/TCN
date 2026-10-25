# Technical Decisions Log

All non-specified implementation decisions or adaptations consistent with `TCN_PRD.md`, `TCN_TRD.md`, and `TCN_DESIGN.md` are documented here.

## Initial Setup Decisions
- **D-01 (Vite + React Setup)**: Use Vite with `react-ts` template directly in `./` with React 18, Tailwind CSS, shadcn/ui primitives (Radix UI), TanStack Query v5, Zustand, Lucide icons, React Router v6.
- **D-02 (ESLint Boundaries)**: Enforce layer model with `no-restricted-imports` rule:
  - `@supabase/supabase-js` is only permitted in `src/lib/supabase.ts`.
  - `src/lib/supabase.ts` is only imported by `src/services/**`.
  - Pages (`src/pages/**`) only import from components (`src/components/**`) or hooks/stores (`src/hooks/**`, `src/stores/**`).
  - Components (`src/components/**`) do not import services (`src/services/**`).
- **D-03 (Testing Strategy)**: Vitest for unit/integration tests (money calculations, time offsets, queue replay, payment splitting, zod schemas). SQL testing for Postgres functions, triggers, and RLS policies using pgTAP syntax in `supabase/tests`. Playwright for viewport responsive tests (390x844 mobile and 1280x800 desktop).
