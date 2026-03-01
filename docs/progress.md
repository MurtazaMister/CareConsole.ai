# Development Progress

## Phase 1: Baseline Setup -- COMPLETE

- `BaselineProfile` type with 4 core symptoms (NRS 0-10), sleep metrics, condition info
- 4-step onboarding wizard (condition -> symptoms -> sleep -> review)
- `BaselineProvider` + `useBaseline` hook
- `MiniSlider`, `LikertScale`, `TimeInput` reusable components

## Phase 2: Daily Logging -- COMPLETE

- `DailyLog` type with symptoms, health check-ins, sleep, notes, computed deviation score
- Multi-step log form with date picker (can log past dates)
- Deviation calculation: sum of absolute differences from baseline across 4 symptoms
- Health check-ins (renamed from "red flags" to neutral language)
- `LogsProvider` + `useLogs` hook with upsert by date

## Phase 3: Dashboard & Visualization -- COMPLETE

- Tabbed dashboard shell with sticky header and user menu
- **Overview tab:** today's status, metric comparison cards with progress bars
- **History tab:** spreadsheet-style log table with expandable detail rows

## Phase 4: Authentication & Profile -- COMPLETE

- Backend: Express + MongoDB + Mongoose
- JWT auth with httpOnly cookies, bcrypt password hashing
- Signup (2-step), login, logout
- Medical profile page (age, height, weight, blood group, allergies, medications)
- Route guards enforcing auth -> profile -> baseline -> dashboard flow
- Frontend context providers integrated with API endpoints

## Phase 5: Interactive Charts -- COMPLETE

- Installed Recharts library, replaced old hand-rolled SVG chart
- **Charts system** with shared date range selector (7d / 14d / 30d / All) and collapsible sections:
  - Symptom Trends (multi-line, toggleable metrics)
  - Overall Deviation (area chart)
  - Today vs Baseline (radar/spider chart)
  - Sleep Patterns (bar + line, collapsed by default)
- `useFilteredLogs` hook for date range filtering
- Sticky chart controls bar below the tab navigation

## Phase 6: Risk Label Removal -- COMPLETE

- Removed all "risk" terminology (flare risk levels, risk badges, risk colors)
- Renamed "Red Flags" to "Health Check-in" throughout the UI
- Neutral styling (indigo instead of red/amber/green for toggles)
- Kept `redFlags` as the data field name for backend compatibility

## Phase 7: Seed Data -- COMPLETE

- 5 test users with realistic disease-specific symptom patterns:
  - Sarah: SLE (90 days) — flare-remission cycles
  - Marcus: PAH (60 days) — progressive breathing decline then medication response
  - Priya: hEDS (90 days) — high variability with cluster flares every ~20 days
  - James: Myasthenia Gravis (45 days) — exacerbation with IVIG recovery
  - Elena: Scleroderma (30 days) — cold-triggered Raynaud's flare
- `SEED_USERS.md` documenting all accounts and patterns

## Phase 8: Flare Detection & Insights Tab -- COMPLETE

- **Flare engine** (`src/lib/flareEngine.ts`): Z-Score normalization, EWMA smoothing, composite weighted scoring, consecutive-day validation, flare window detection, explainability data
- **Baseline window sigma:** Standard deviation computed from first 14 days only, preventing flare data from inflating sigma
- **Calibrated thresholds:** Watch 0.8, Mild 1.5, Severe 2.5 (tuned for realistic Z-score ranges)
- **Insights tab** with:
  - Methodology disclosure at top
  - Status banner with score ring and trend indicator
  - Summary cards (flare windows, flare days, worst symptom, trend)
  - Composite flare score chart with threshold reference lines
  - Per-symptom EWMA chart with metric toggles
  - Flare timeline (clickable horizontal bar)
  - Event detail cards with "Why was this flagged?" explainability
- **Flare window overlays** on existing Overview charts (SymptomTrendChart, DeviationTrendChart)
- `useFlareEngine` hook for memoized computation
