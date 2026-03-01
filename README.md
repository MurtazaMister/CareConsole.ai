# HackRare

A patient-centered health dashboard for **early flare detection** in chronic and rare diseases.

Patients define their personal health baseline, track daily symptoms, and get statistical insights into when their condition is worsening — before a full flare hits.

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd server
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`, the backend on `http://localhost:5001`.

### Seed Demo Data

```bash
cd server
npx ts-node src/seed.ts
```

This creates 5 test users with realistic disease-specific symptom data. See [SEED_USERS.md](SEED_USERS.md) for login credentials and disease patterns.

## What It Does

1. **Baseline Setup** — Patient rates their "normal" symptom levels (pain, fatigue, breathing, function), sleep, and condition info
2. **Daily Logging** — Log symptoms each day with health check-ins, sleep data, and notes
3. **Trend Visualization** — Charts showing symptom trends, deviation from baseline, sleep patterns, and today-vs-baseline radar comparison
4. **Flare Detection** — Statistical engine using Z-Score normalization, EWMA smoothing, and composite scoring to detect sustained symptom worsening and identify flare windows
5. **Explainability** — Every detected flare explains which symptoms drove it and why it was flagged

## Documentation

| Document | What it covers |
|----------|---------------|
| [Features Guide](docs/features.md) | What each tab and feature does |
| [Architecture](docs/architecture.md) | Tech stack, data flow, project structure |
| [Flare Detection](docs/flare-detection.md) | How the statistical flare detection algorithm works |
| [Development Progress](docs/progress.md) | What's been built across each phase |
| [Seed Users](SEED_USERS.md) | Test accounts and their disease patterns |

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, React Router 7

**Backend:** Node.js, Express, MongoDB, Mongoose, JWT (httpOnly cookies), bcrypt
