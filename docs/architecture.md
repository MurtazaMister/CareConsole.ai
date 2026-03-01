# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 4 (PostCSS plugin) |
| Charts | Recharts 3 |
| Routing | React Router 7 |
| State | React Context API |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT (httpOnly cookies), bcrypt |

## Data Flow

```
Browser                          Server                    Database
------                          ------                    --------
AuthProvider ---login/signup---> POST /api/auth/*  ------> Users collection
                                  (JWT cookie set)

BaselineProvider ---fetch------> GET /api/baseline ------> Baselines collection
                 ---save-------> PUT /api/baseline ------> (upsert, one per user)

LogsProvider -----fetch-------> GET /api/logs -----------> DailyLogs collection
             -----save-------> POST /api/logs ----------> (upsert by user+date)

useFlareEngine (frontend-only, no API call)
  reads from: BaselineProvider (baseline values)
  reads from: LogsProvider (all logs)
  computes:   Z-Scores, EWMA, composite scores, flare windows
  returns:    FlareEngineResult (used by InsightsTab + chart overlays)
```

## Authentication

- Signup/login returns a JWT stored in an httpOnly cookie
- Every API request includes the cookie automatically
- Server middleware extracts `userId` from the token
- All data is scoped per user (baseline, logs)

## Frontend State Management

Three context providers wrap the app:

```
AuthProvider        -> currentUser, login(), signup(), logout()
  BaselineProvider  -> baseline, fetchBaseline(), setBaseline()
    LogsProvider    -> logs, fetchLogs(), addLog(), getTodayLog()
```

Each provider fetches from the API and caches in React state. The Dashboard component triggers the initial fetch on mount.

## Flare Detection

The flare engine runs **entirely in the frontend**. It takes the baseline profile and all daily logs (already in context) and computes everything client-side. No backend endpoint needed.

See [flare-detection.md](flare-detection.md) for the full algorithm.

## Project Structure

```
src/
├── pages/                    # Route-level components
│   ├── Auth.tsx              # Login + 2-step signup
│   ├── ProfileSetup.tsx      # Medical demographics form
│   ├── Onboarding.tsx        # 4-step baseline wizard
│   └── Dashboard.tsx         # Tab shell, fetches data on mount
│
├── components/               # UI components
│   ├── TabBar.tsx            # 4-tab navigation (overview/log/history/insights)
│   ├── OverviewTab.tsx       # Today's status + charts + baseline comparison
│   ├── LogTab.tsx            # 4-step daily logging form
│   ├── HistoryTab.tsx        # Log table + deviation chart
│   ├── InsightsTab.tsx       # Flare detection dashboard
│   ├── RequireAuth.tsx       # Route guard
│   ├── MiniSlider.tsx        # 0-10 symptom slider with baseline badge
│   ├── LikertScale.tsx       # 1-5 sleep quality selector
│   ├── TimeInput.tsx         # HH:MM time picker
│   │
│   ├── charts/               # Recharts-based visualizations
│   │   ├── ChartsPanel.tsx   # Orchestrator: date range + all chart sections
│   │   ├── ChartSection.tsx  # Collapsible card wrapper
│   │   ├── DateRangeSelector.tsx
│   │   ├── MetricToggle.tsx  # Colored pills to toggle symptom lines
│   │   ├── SymptomTrendChart.tsx    # Multi-line symptom chart
│   │   ├── DeviationTrendChart.tsx  # Area chart of deviation scores
│   │   ├── SymptomRadarChart.tsx    # Today vs baseline spider chart
│   │   └── SleepChart.tsx           # Bar (hours) + line (quality)
│   │
│   └── insights/             # Flare detection UI
│       ├── FlareStatusBanner.tsx    # Current status + score ring
│       ├── FlareSummaryCards.tsx     # 4-card stats grid
│       ├── CompositeScoreChart.tsx   # Composite score + threshold lines
│       ├── SymptomEWMAChart.tsx      # Per-symptom smoothed trends
│       ├── FlareTimeline.tsx        # Horizontal timeline bar
│       └── FlareEventCard.tsx       # "Why was this flagged?" cards
│
├── lib/
│   └── flareEngine.ts        # Pure computation: Z-Score, EWMA, flare windows
│
├── hooks/
│   ├── useAuth.ts
│   ├── useBaseline.ts
│   ├── useLogs.ts
│   ├── useFilteredLogs.ts    # Filter logs by date range
│   └── useFlareEngine.ts     # Memoized flare detection hook
│
├── context/
│   ├── AuthProvider.tsx / authContext.ts
│   ├── BaselineProvider.tsx / baselineContext.ts
│   └── LogsProvider.tsx / logsContext.ts
│
├── types/
│   ├── user.ts               # UserAccount, UserProfile, validation
│   ├── baseline.ts           # BaselineProfile, SYMPTOM_METRICS
│   └── dailyLog.ts           # DailyLog, calculateDeviation, helpers
│
├── constants/
│   ├── chartTheme.ts         # Shared chart styling, colors, date ranges
│   └── flareTheme.ts         # Flare level colors, thresholds
│
└── App.tsx                   # Router + provider nesting

server/src/
├── index.ts                  # Express app setup, middleware, routes
├── seed.ts                   # Populates 5 demo users with disease data
│
├── config/
│   ├── db.ts                 # MongoDB connection
│   └── env.ts                # Environment variable validation
│
├── models/
│   ├── User.ts               # Username, email, password, profile subdoc
│   ├── Baseline.ts           # One per user, all baseline metrics
│   └── DailyLog.ts           # One per user+date, symptoms + computed fields
│
├── controllers/
│   ├── authController.ts     # signup, login, me, logout
│   ├── userController.ts     # saveProfile
│   ├── baselineController.ts # getBaseline, upsertBaseline
│   └── logsController.ts     # getLogs, getLogByDate, createOrUpdateLog
│
├── routes/
│   ├── auth.ts               # POST signup/login/logout, GET me
│   ├── user.ts               # PUT profile
│   ├── baseline.ts           # GET/PUT baseline
│   └── logs.ts               # GET/POST logs, GET logs/:date
│
├── middleware/
│   ├── auth.ts               # JWT verification, extracts userId
│   ├── errorHandler.ts       # Global error handler + asyncHandler
│   └── validate.ts           # Input validation helpers
│
└── utils/
    └── flareLogic.ts         # Server-side deviation + risk calculation
```

## Clinical Data Schema

### Core Symptoms (NRS 0-10)

| Metric | Key | Description |
|--------|-----|-------------|
| Body Pain | `painLevel` | Overall body pain level |
| Fatigue | `fatigueLevel` | Fatigue or weakness |
| Breathing | `breathingDifficulty` | Difficulty breathing |
| Task Limitation | `functionalLimitation` | How much symptoms prevent normal tasks |

### Sleep

- Hours (3-12), quality (1-5 Likert), bedtime (HH:MM), wake time (HH:MM)

### Health Check-in (binary)

- Sudden chest pain, severe weakness, or confusion
- New fever, sweats, or chills
- Missed medications or started a new one

### Deviation Score

Sum of absolute differences between daily values and baseline across the 4 core symptoms.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | No | Create account |
| POST | /api/auth/login | No | Login, sets JWT cookie |
| GET | /api/auth/me | Yes | Current user info |
| POST | /api/auth/logout | Yes | Clear cookie |
| PUT | /api/user/profile | Yes | Save medical profile |
| GET | /api/baseline | Yes | Get user's baseline |
| PUT | /api/baseline | Yes | Create/update baseline |
| GET | /api/logs | Yes | Get all user's logs |
| POST | /api/logs | Yes | Create/update log for a date |
| GET | /api/logs/:date | Yes | Get log for specific date |
