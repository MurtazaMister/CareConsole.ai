# HackRare — Development Progress

## Phase 1: Baseline Setup

**Status: Complete**

- Created `BaselineProfile` interface in `src/types/baseline.ts`
- Defined 4 core symptom metrics (NRS 0–10): Body Pain, Fatigue, Breathing Difficulty, Task Limitation
  - Originally had 5 metrics including "Main Symptom Severity" — removed as too vague
- Defined sleep metrics: hours (3–12), quality (1–5 Likert), bedtime, wake time
- Built `BaselineProvider` with localStorage persistence (key: `hackrare-baseline`)
- Built `useBaseline()` hook

### Onboarding Wizard (`src/pages/Onboarding.tsx`)
- 4-step wizard with progress bar
- **Step 0**: Primary condition name + duration in months (with year conversion display)
- **Step 1**: 4 symptom sliders using `MiniSlider` component
- **Step 2**: Sleep baseline — hours slider, quality Likert scale, bedtime/wake time pickers
- **Step 3**: Review & confirm — shows all values, clickable sections to jump back, confirmation checkbox required
- `baselineDate` auto-set to the current date on creation, preserved when editing
- Step navigation with validation (condition + duration required before proceeding)

---

## Phase 2: Daily Logging

**Status: Complete**

- Created `DailyLog` interface in `src/types/dailyLog.ts`
- Implemented deviation calculation: sum of absolute differences across 4 core metrics vs baseline
- Implemented flare risk classification: red flags → high, deviation >10 or single >=4 → high, >=6 → medium, else low
- Built `LogsProvider` with localStorage persistence (key: `hackrare-logs`)
  - `addLog()` performs upsert by date (one log per date)
  - `getLogByDate()` retrieves log for a specific date
  - `getTodayLog()` convenience method
- Built `useLogs()` hook

### Log Tab (`src/components/LogTab.tsx`)
- Multi-step wizard (symptoms → red flags → sleep → notes → review)
- **Date picker** at the top: select any date between baseline date and today
  - "Today" quick-reset button
  - Shows "Editing existing log" indicator when a log already exists for the selected date
  - Form re-initializes when date changes: loads existing log values or baseline defaults
- Each symptom slider shows deviation from baseline with color-coded indicator
- Red flags as toggle switches (any = immediate high risk)
- Sleep section: hours slider, quality Likert, bedtime/wake time
- Notes field (150 char max)
- Review step shows computed deviation score and flare risk level with color coding
- `createEmptyLogForm(baseline)` uses baseline values as form defaults

---

## Phase 3: Dashboard & Visualization

**Status: Complete**

### Dashboard Shell (`src/pages/Dashboard.tsx`)
- Tabbed layout: Overview / Daily Log / History
- Sticky header with app name, baseline date display, and user avatar menu
- User dropdown menu: View Profile, Edit Baseline, Log Out
- Tab bar with pulse indicator when today's log hasn't been submitted
- Redirects to `/onboarding` if no baseline exists

### Overview Tab (`src/components/OverviewTab.tsx`)
- **Today's Status Card**: flare risk level badge, deviation score, quick stats (symptoms logged, sleep hours, red flags count)
- **Metric Comparison**: side-by-side bars showing baseline vs today's value for each symptom, with deviation indicator
- **Sleep Summary**: hours vs baseline, quality label, bedtime/wake comparison
- **Red Flags Section**: shows active red flags with warning styling
- **Recent Logs**: last 7 entries with date, risk badge, deviation score, expandable

### History Tab (`src/components/HistoryTab.tsx`)
- **Trend Chart** (`src/components/TrendChart.tsx`): SVG line chart showing deviation scores over time, color-coded by flare risk level (green/amber/red dots)
- **Log List**: all logs in reverse chronological order
  - Each entry expandable to show full details: symptom values, sleep data, red flags, notes
  - Flare risk badge and deviation score on each entry

### Backward Compatibility
- All `redFlags` accesses use optional chaining (`?.`) to handle old localStorage data that may lack the `redFlags` field

---

## Phase 4: Authentication & Profile System

**Status: Complete**

### Data Models (`src/types/user.ts`)
- `UserAccount`: id (UUID), username, email, password (plaintext — backend auth planned), createdAt
- `UserProfile`: age, heightCm, weightKg, bloodGroup, allergies (string[]), currentMedications (string[]), completedAt
- `BloodGroup` type: A+, A-, B+, B-, AB+, AB-, O+, O-
- Validation helpers: `validateEmail()`, `validateUsername()` (3-20 chars, alphanumeric + underscores), `validatePassword()` (8+ chars)

### Auth Context (`src/context/AuthProvider.tsx`)
- Stores accounts in `hackrare-accounts` (array in localStorage)
- Session tracking in `hackrare-session`
- Profile in `hackrare-profile`
- `signup()` — validates uniqueness of email and username, generates UUID
- `login()` — matches by email OR username + password
- `logout()` — clears session only (preserves account data)

### Auth Page (`src/pages/Auth.tsx`)
- Toggle between **Sign Up** and **Log In** modes
- **Sign Up**: 2-step wizard
  - Step 1: Username + Email
  - Step 2: Password + Confirm Password
- **Log In**: Single form with email/username + password
- Redirects to `/profile-setup` after signup, `/dashboard` after login
- Inline validation and error messages

### Profile Setup (`src/pages/ProfileSetup.tsx`)
- Single-page form for medical profile
- Fields: age, height (cm), weight (kg), blood group (8 pill-style toggle buttons), allergies (textarea, comma-separated), current medications (textarea, comma-separated)
- All fields optional except completion (submitting the form marks profile as complete)
- Redirects to `/onboarding` (or `/dashboard` if baseline already exists)

### Route Guards (`src/components/RequireAuth.tsx`)
- `RequireAuth` wrapper component with optional `requireProfile` prop
- Waterfall: no auth → `/auth`, no profile (when required) → `/profile-setup`

### Routing (`src/App.tsx`)
- Provider nesting: `AuthProvider > BaselineProvider > LogsProvider > BrowserRouter`
- Routes:
  - `/auth` — public
  - `/profile-setup` — requires auth
  - `/onboarding` — requires auth + profile
  - `/dashboard` — requires auth + profile
  - `*` → redirects to `/dashboard`

---

## Phase 5: Date Selection for Logs

**Status: Complete**

- Added `baselineDate: string` field to `BaselineProfile` (YYYY-MM-DD format)
- `baselineDate` is auto-set to the current date when the baseline is first created
- When editing an existing baseline, `baselineDate` is preserved (not overwritten)
- Added `formatDateString(date: Date)` utility to `dailyLog.ts`

### Log Tab Date Picker
- Native HTML date input styled to match app theme
- Constraints: `min` = baseline date, `max` = today
- "Today" button for quick reset
- When date changes:
  - If log exists for that date → loads existing values into form (edit mode)
  - If no log → resets form to baseline defaults via `createEmptyLogForm(baseline)`
- Save button label changes: "Update Log" when editing, "Save Log" when new
- Shows visual indicator when logging for a date other than today
- Form re-initialization uses a tracked `formDate` state pattern (no useEffect needed)

### Dashboard Updates
- Header shows `baselineDate` formatted as readable date (e.g., "February 28, 2026")
- Falls back to `createdAt` for backward compatibility with old baseline data

---

## Known Limitations / Technical Debt

1. **No backend** — all data is in localStorage. Backend integration is the next planned phase.
2. **Auth is a UI gate only** — passwords stored in plaintext in localStorage, data not scoped per-user.
3. **No data export** — no way to export logs to CSV/PDF yet.
4. **No notifications/reminders** — no push notifications for daily logging.
5. **SVG chart is basic** — no zoom, no date range filtering, no multi-metric overlay.
6. **No medication tracking** — medications are stored in profile but not tracked daily.

---

## Reusable Components

| Component | File | Purpose |
|-----------|------|---------|
| `MiniSlider` | `src/components/MiniSlider.tsx` | 0–10 NRS slider with optional baseline deviation indicator |
| `LikertScale` | `src/components/LikertScale.tsx` | 1–5 sleep quality button group |
| `TimeInput` | `src/components/TimeInput.tsx` | HH:MM time picker styled to match app |
| `TabBar` | `src/components/TabBar.tsx` | 3-tab navigation with unlogged-today pulse |
| `TrendChart` | `src/components/TrendChart.tsx` | SVG line chart for deviation score history |
| `RequireAuth` | `src/components/RequireAuth.tsx` | Route guard with optional profile requirement |

---

## Deleted Files

- `src/components/ChipSelect.tsx` — removed during clinical schema rewrite (unused)
- `src/components/MetricSlider.tsx` — removed during clinical schema rewrite (replaced by MiniSlider)
