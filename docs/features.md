# Features Guide

## User Flow

```
Sign Up / Log In
  -> Profile Setup (age, height, weight, blood group, medications)
    -> Baseline Onboarding (4-step wizard: condition, symptoms, sleep, review)
      -> Dashboard (4 tabs)
```

Route guards enforce this order — skipping a step redirects you back.

---

## Dashboard Tabs

### Overview

The landing tab. Shows a snapshot of today vs your baseline.

- **Today's Status** — Whether you've logged today, with a prompt to log if not
- **Charts Panel** — Interactive charts with a shared date range selector (7d / 14d / 30d / All):
  - **Today vs Baseline (Radar)** — Spider chart overlaying your today's values on top of your baseline. Instantly shows which symptoms are elevated
  - **Symptom Trends (Line)** — Each symptom plotted over time as separate colored lines. Toggle individual symptoms on/off with the metric pills. Flare windows show as faint shaded regions
  - **Overall Deviation (Area)** — Total deviation score over time. Flare windows are overlaid here too
  - **Sleep Patterns (Bar + Line)** — Sleep hours as bars, quality as a line. Collapsed by default
- **Today vs Baseline Cards** — Side-by-side progress bars comparing each symptom's current value to baseline, with difference indicators

### Daily Log

A 4-step form to record how you're doing today.

- **Step 1: Symptoms** — Four 0-10 sliders (pain, fatigue, breathing, functional limitation). Each slider shows how far you are from your baseline
- **Step 2: Health Check-in** — Three yes/no questions about chest pain/weakness, fever/chills, and medication changes
- **Step 3: Sleep** — Hours slept, sleep quality (1-5), bedtime and wake time
- **Step 4: Review** — Summary of everything you entered, deviation from baseline, and a save button

You can log for any date between your baseline date and today using the date picker at the top. Editing an existing log pre-fills the form with those values.

### History

A spreadsheet-style view of all your past logs.

- **Deviation Trend Chart** — Area chart of deviation scores across all logged days
- **Log Table** — Each row shows date, symptom values, sleep hours, quality, deviation score, and notes
- **Expandable Details** — Click any row to see full symptom breakdown, health check-in results, sleep times, and notes

### Insights

The flare detection dashboard. This is where the statistical analysis lives.

- **How Does Flare Detection Work?** — Collapsible explanation of the methodology (Z-Score, EWMA, composite scoring, consecutive-day validation). Placed at the top so doctors/researchers understand the approach before seeing results
- **Status Banner** — Current flare status (No Flare / Watch / Mild Flare / Severe Flare) with composite score displayed in a ring indicator, trend direction, and how many days you've been at this level
- **Summary Cards** — Four cards:
  - Flare Windows: how many detected in total
  - Flare Days: count and percentage of tracked days
  - Most Affected: which symptom has the highest average signal
  - 7-Day Trend: improving, stable, or worsening
- **Composite Flare Score Chart** — Area chart of the combined flare score over time with dashed threshold lines (Watch at 0.8, Mild at 1.5, Severe at 2.5) and shaded flare windows
- **Symptom Signals (EWMA)** — Per-symptom smoothed trend lines. Shows how each symptom's EWMA value evolves, with metric toggles to show/hide individual symptoms
- **Flare Timeline** — Horizontal bar spanning the full date range with colored segments marking each flare window. Click a segment to jump to its details
- **Detected Events** — Expandable cards for each flare window:
  - Collapsed: date range, duration, severity badge, peak score
  - Expanded: "Why was this flagged?" explanation, contributing symptom bars with percentages, day-by-day score table, and any notes from that period

---

## Onboarding

A 4-step wizard that establishes your personal baseline:

1. **Condition** — Primary condition name and how long you've had it
2. **Symptoms** — Rate your typical (average day) level for pain, fatigue, breathing difficulty, and functional limitation on a 0-10 scale
3. **Sleep** — Usual hours of sleep, sleep quality, typical bedtime and wake time
4. **Review** — Confirm all values before saving

The baseline represents your "normal" — not your best day and not your worst day. All future tracking and flare detection compares against these values.

---

## Profile Setup

Collects medical demographics (all optional except submitting the form):

- Age, height, weight
- Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Known allergies
- Current medications
