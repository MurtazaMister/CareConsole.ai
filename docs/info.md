# HackRare — Project Overview

## What We're Building

HackRare is a **patient-centered health dashboard for early flare detection** in chronic and rare diseases. It helps patients track their daily symptoms against a personal baseline, detect deviations that may signal an oncoming flare, and maintain a history of their condition over time.

The target users are people living with conditions like Lupus, Sickle Cell Disease, Chronic Fatigue Syndrome, and other rare/chronic diseases where early flare detection can meaningfully improve outcomes.

## Core Concept

1. **Baseline Profile** — The patient establishes their "normal" by rating their typical symptom levels, sleep patterns, and condition info. This represents an average day — not their best, not their worst.

2. **Daily Logging** — Each day (or retroactively for missed days), the patient logs their current symptom levels, sleep, red flags, and notes.

3. **Deviation & Flare Risk** — The system compares daily logs against the baseline to compute a deviation score and classify flare risk as low/medium/high. Any red flag (chest pain, fever, medication changes) immediately triggers high risk.

## Clinical Schema

### Core Symptoms (NRS 0–10)
Each symptom uses a clinically standard Numeric Rating Scale:
- **Body Pain** — overall body pain level
- **Fatigue** — fatigue or weakness
- **Breathing Difficulty** — difficulty breathing
- **Task Limitation** — how much symptoms prevent normal daily tasks

### Sleep Metrics
- Sleep hours (3–12)
- Sleep quality (1–5 Likert scale: Very Poor → Very Good)
- Usual bedtime and wake time (HH:MM)

### Red Flags (Binary — Safety Critical)
- Sudden chest pain, severe weakness, or confusion
- New fever, sweats, or chills
- Missed medications or started a new one

### Flare Risk Algorithm
```
Any red flag = HIGH
Deviation total > 10 OR any single metric deviation >= 4 = HIGH
Deviation total >= 6 = MEDIUM
Otherwise = LOW
```

Deviation is computed as the sum of absolute differences between daily log values and baseline values across the 4 core symptom metrics.

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS v4** (PostCSS plugin, not `@tailwind` directives)
- **React Router v7** for navigation
- **Context API** for state management (no Redux/Zustand)
- **localStorage** for persistence (backend not yet implemented)
- **SVG-based** trend chart (no external charting library)

## User Flow

```
Auth (signup/login)
  → Profile Setup (age, height, weight, blood group, medical info)
    → Onboarding (4-step baseline wizard)
      → Dashboard (overview / daily log / history tabs)
```

Route guards enforce this waterfall:
- No auth → redirect to `/auth`
- No medical profile → redirect to `/profile-setup`
- No baseline → redirect to `/onboarding`

## Data Storage (localStorage)

| Key | Contents |
|-----|----------|
| `hackrare-accounts` | Array of user accounts |
| `hackrare-session` | Current session (user ID) |
| `hackrare-profile` | Medical profile |
| `hackrare-baseline` | Baseline profile |
| `hackrare-logs` | Array of daily log entries |

**Note:** Data is not scoped per-user yet. Auth is currently a UI gate only. Backend integration is planned as the next major phase.

## Project Structure

```
src/
├── types/           # Data models and business logic
│   ├── baseline.ts  # BaselineProfile, SYMPTOM_METRICS, SLEEP_QUALITY_LABELS
│   ├── dailyLog.ts  # DailyLog, deviation/flare calculations, helpers
│   └── user.ts      # UserAccount, UserProfile, validation
├── context/         # React context definitions and providers
│   ├── authContext.ts / AuthProvider.tsx
│   ├── baselineContext.ts / BaselineProvider.tsx
│   └── logsContext.ts / LogsProvider.tsx
├── hooks/           # Consumer hooks (useAuth, useBaseline, useLogs)
├── pages/           # Route-level components
│   ├── Auth.tsx         # Signup (2-step) + Login
│   ├── ProfileSetup.tsx # Medical profile form
│   ├── Onboarding.tsx   # 4-step baseline wizard
│   └── Dashboard.tsx    # Tabbed dashboard shell
├── components/      # Shared UI components
│   ├── OverviewTab.tsx  # Today's status + metric comparisons
│   ├── LogTab.tsx       # Daily log wizard with date picker
│   ├── HistoryTab.tsx   # Log history + trend chart
│   ├── TrendChart.tsx   # SVG line chart for deviation scores
│   ├── TabBar.tsx       # 3-tab navigation
│   ├── MiniSlider.tsx   # 0-10 symptom slider
│   ├── LikertScale.tsx  # 1-5 sleep quality selector
│   ├── TimeInput.tsx    # HH:MM time picker
│   └── RequireAuth.tsx  # Route guard component
└── App.tsx          # Router + provider nesting
```

## ESLint Constraint

The project uses `eslint-plugin-react-refresh` which requires that context definition (createContext), provider component, and consumer hook each be in separate files. This is why context/hooks are split across multiple files.
