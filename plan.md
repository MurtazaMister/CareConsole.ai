Here is your **`plan.md`** content for Phase 1.
You can copy this directly into a `plan.md` file.

---

# Phase 1 – Baseline Setup Dashboard (Frontend Prototype)

## 🎯 Objective

Build a working frontend prototype where a user sets up their **Baseline Profile** through a dashboard-style onboarding flow.

Baseline setup should:

* Happen once during onboarding
* Be required before accessing the main dashboard
* Represent the user’s “usual” or “normal” health state
* Be editable later (but not required for Phase 1 demo)

This phase focuses only on frontend implementation.

---

# 🧱 Scope

### Included

* Onboarding page for baseline setup
* Dashboard page showing baseline summary
* Local state management
* Local persistence (localStorage)
* Basic validation
* Clean, demo-ready UI

### Not Included

* Backend API
* Authentication
* Daily symptom logging
* Analytics
* AI features

---

# 🗂️ Deliverables

1. Functional `/onboarding` route
2. Functional `/dashboard` route
3. Baseline data model
4. Baseline stored in localStorage
5. Redirect logic:

   * If baseline exists → go to dashboard
   * If not → go to onboarding

---

# 🧩 Baseline Data Model

Create a structured baseline profile with the following fields:

* energyLevel (1–10)
* painLevel (1–10)
* moodLevel (1–10)
* sleepQuality (1–10)
* mobility (1–10)
* optional notes
* createdAt timestamp

Each metric must:

* Use a 1–10 numeric scale
* Be required
* Clearly explain what 1 means and what 10 means

---

# 🛠️ Feature Tasks

## Task 1 – Project Setup

* Initialize frontend project (React + TypeScript recommended)
* Install styling system (Tailwind or similar)
* Set up routing
* Create base layout component

---

## Task 2 – Baseline State Management

* Create a central store (Context API or Zustand)
* Store baseline in memory
* Persist baseline to localStorage
* Load baseline from localStorage on app start
* Provide:

  * setBaseline()
  * getBaseline()
  * clearBaseline()

---

## Task 3 – Onboarding Page (/onboarding)

### Requirements

Display explanation:

> “Your baseline represents your usual condition — not your best day, not your worst day — just your normal.”

### Form Inputs

For each metric:

* Slider input (1–10)
* Live numeric display
* Short helper text explaining scale meaning

Example:

Energy Level
1 = Cannot get out of bed
10 = Fully active and energetic

### Validation Rules

* All fields required
* Must confirm via checkbox:

  * “I confirm this represents my usual condition.”
* Submit button disabled until valid

### On Submit

* Save baseline to store
* Persist to localStorage
* Redirect to `/dashboard`

---

## Task 4 – Dashboard Page (/dashboard)

### Access Control

If baseline does not exist:

* Automatically redirect to `/onboarding`

### Layout

Dashboard should include:

1. Welcome message
2. Baseline Summary Section
3. Baseline creation date
4. “Edit Baseline” button

---

## Task 5 – Baseline Summary Component

Display each metric as a card:

* Metric Name
* Value (1–10)
* Short interpretation text

Example:

Pain Level: 4/10
Interpretation: Mild persistent pain is part of your normal baseline.

---

## Task 6 – Edit Baseline Flow

* Clicking “Edit Baseline” returns user to onboarding
* Form should be pre-filled with existing baseline values
* Saving updates localStorage

---

# 🧪 Testing Checklist

* App loads without errors
* On first load → onboarding appears
* Submitting baseline redirects to dashboard
* Refresh retains baseline
* Clearing localStorage resets flow
* Edit baseline works correctly

---

# 🎨 UI Guidelines

* Clean, minimal medical UI
* Neutral color palette
* Clear typography
* Accessible sliders
* Mobile responsive
* Avoid clutter

This is a prototype but should feel production-ready.

---

# 🧠 Product Principles for Baseline

1. Baseline is personal.
2. It represents usual condition, not perfection.
3. It becomes the reference point for future symptom tracking.
4. It should be simple and not overwhelming.

---

# ✅ Definition of Done

Phase 1 is complete when:

* A user can fill out baseline once
* Data persists across refresh
* Dashboard displays saved baseline
* Flow feels smooth and intuitive
* Code is modular and scalable for Phase 2


Here is your **Phase 2** section written in clean Markdown format.
You can append this directly to your existing `plan.md`.

---

# Phase 2 – Daily Logging Dashboard (Symptom Tracking)

## 🎯 Objective

Build a daily logging dashboard where users record their current condition and compare it against their baseline.

This phase introduces:

* Daily symptom logging
* Baseline deviation comparison
* Simple flare risk indication (rule-based, not AI)
* Historical log storage
* Basic trend visualization

This phase builds directly on Phase 1.

---

# 🧱 Scope

### Included

* Daily logging form
* Baseline comparison logic
* Deviation indicators
* Log history view
* Local persistence
* Simple rule-based flare detection
* Clean dashboard UI

### Not Included

* Backend APIs
* Machine learning
* Real notifications
* Doctor sharing features
* Advanced analytics

---

# 🗂️ Deliverables

1. `/log` route for daily entry
2. Updated `/dashboard` showing:

   * Today’s status
   * Deviation from baseline
   * Flare risk indicator
3. Log history view
4. Data stored in localStorage
5. Basic trend visualization (simple chart)

---

# 🧩 Daily Log Data Model

Create a structured daily log entry:

* date (ISO string)
* energyLevel (1–10)
* painLevel (1–10)
* moodLevel (1–10)
* sleepQuality (1–10)
* mobility (1–10)
* optional notes
* deviationScore (calculated)
* flareRiskLevel (low / medium / high)

---

# 🛠️ Feature Tasks

---

## Task 1 – Logging State Management

Extend store to support:

* addDailyLog()
* getLogs()
* getTodayLog()
* calculateDeviation()
* calculateFlareRisk()

Persist logs in localStorage.

Each day should only allow one entry (editable).

---

## Task 2 – Logging Page (/log)

### Page Purpose

Allow users to record:

> “How are you feeling today?”

### Form Inputs

Use same 1–10 scale sliders as baseline for consistency.

Each metric must:

* Show baseline value
* Show current selected value
* Show deviation indicator (+ / - difference)

Example:

Pain Today: 6
Baseline: 4
Deviation: +2

---

## Task 3 – Deviation Logic

For each metric:

deviation = todayValue - baselineValue

Overall deviation score:

Sum of absolute deviations across all metrics.

Example:

Energy: -2
Pain: +3
Mood: -1
Sleep: -2
Mobility: -1

Total Deviation Score = 9

Store this value.

---

## Task 4 – Flare Risk Rules (Simple Logic)

Use rule-based classification:

* Low Risk:

  * Total deviation ≤ 5
* Medium Risk:

  * Total deviation between 6–10
* High Risk:

  * Total deviation > 10
    OR
  * Any single metric deviation ≥ 4

Return:

* "low"
* "medium"
* "high"

This is not medical advice. It is pattern detection only.

---

## Task 5 – Dashboard Update

Update `/dashboard` to show:

### Section 1 – Today’s Status

* Logged or not logged indicator
* Deviation score
* Flare risk badge (color-coded)

### Section 2 – Metric Comparison Cards

For each metric:

* Baseline value
* Today value
* Difference
* Small arrow (↑ ↓ →)

### Section 3 – Quick Action

* “Log Today” button (if not logged)
* “Edit Today’s Log” button (if already logged)

---

## Task 6 – Log History View

Create simple history list:

For each day:

* Date
* Deviation score
* Flare risk level
* Expandable details

Sort descending by date.

---

## Task 7 – Basic Trend Visualization

Add simple line chart showing:

* X-axis: Dates
* Y-axis: Deviation Score

Optional (if time permits):

* Separate mini-trends per metric

Keep it minimal and clean.

---

# 🧪 Validation Rules

* Baseline must exist before logging
* Cannot log multiple times for same date
* All metrics required
* Form should auto-save if needed (optional enhancement)

---

# 🧠 Product Principles for Logging

1. Logging must take less than 60 seconds.
2. Visual feedback must be immediate.
3. Deviation must be understandable at a glance.
4. Flare indication must be calm, not alarming.
5. Avoid medical claims.

---

# 🎨 UI Guidelines

* Keep consistent scale UI from Phase 1
* Color coding:

  * Low risk → green
  * Medium risk → amber
  * High risk → red
* Show differences clearly
* Avoid clutter
* Mobile-friendly

---

# 🔄 Flow Summary

If baseline does not exist:

* Redirect to onboarding

If baseline exists:

* User logs daily
* System calculates deviation
* System classifies flare risk
* Dashboard updates dynamically

---

# ✅ Definition of Done

Phase 2 is complete when:

* User can log daily condition
* Data persists across refresh
* Deviation is calculated correctly
* Flare risk is classified correctly
* Dashboard updates dynamically
* Trend chart renders correctly
* UX feels simple and fast

---

After Phase 2, the product becomes:

Baseline + Daily Logging + Rule-Based Flare Detection

This is now a strong hackathon-level MVP.

