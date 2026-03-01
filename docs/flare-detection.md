# Flare Detection Algorithm

All computation runs in the frontend (`src/lib/flareEngine.ts`). The engine takes a user's baseline profile and all their daily logs, then outputs daily analysis, detected flare windows, and summary statistics.

## Pipeline

```
Raw symptom values
  -> Z-Score (how far from baseline?)
    -> Positive Z only (ignore "better than normal")
      -> EWMA smoothing (filter out one-off spikes)
        -> Composite score (combine all symptoms)
          -> Level classification (none / watch / mild / severe)
            -> Consecutive-day validation (require persistence)
              -> Flare window detection (group into events)
```

## Step 1: Z-Score Normalization

For each symptom on each day, we measure how many standard deviations the value is from the baseline.

```
z = (today's value - baseline value) / standard deviation
```

- **Baseline value (mu):** The values the user set during onboarding — their "normal"
- **Standard deviation (sigma):** Computed from the first 14 days of logs. Using only early data prevents flare days from inflating the standard deviation and masking future flares
- **Floor:** If sigma < 0.75, we use 0.75 to prevent near-zero variance from producing extreme Z-scores

**Example:** Baseline pain = 4, sigma = 0.8. Today's pain = 8.
Z-score = (8 - 4) / 0.8 = 5.0 (5 standard deviations above normal)

## Step 2: Positive Z-Scores Only

We only care about symptoms getting **worse**. If you're having a better-than-normal day (Z < 0), that doesn't reduce your flare signal.

```
positiveZ = max(0, z)
```

## Step 3: EWMA Smoothing

A single bad day shouldn't trigger a flare alert. Exponentially Weighted Moving Average (EWMA) smooths the signal so only sustained worsening builds up.

```
EWMA(today) = 0.3 * positiveZ(today) + 0.7 * EWMA(yesterday)
```

- Alpha = 0.3 means today's value gets 30% weight, and the accumulated history gets 70%
- It takes several consecutive elevated days for the EWMA to climb significantly
- After symptoms return to normal, the EWMA decays back toward zero over a few days

## Step 4: Composite Score

All 4 symptoms are combined into a single score using clinical weights:

```
composite = Pain EWMA * 0.30
          + Fatigue EWMA * 0.25
          + Breathing EWMA * 0.25
          + Function EWMA * 0.20
```

Pain is weighted highest because it's the most universally reported symptom across rare diseases.

## Step 5: Level Classification

| Composite Score | Level | Meaning |
|----------------|-------|---------|
| < 0.8 | None | Within normal variation |
| 0.8 - 1.5 | Watch | Symptoms trending up, worth monitoring |
| 1.5 - 2.5 | Mild Flare | Sustained elevation across multiple symptoms |
| >= 2.5 | Severe Flare | Significant sustained worsening |

## Step 6: Consecutive-Day Validation

To prevent isolated spikes from being labeled as flares:

- **Mild** requires at least 2 consecutive days where the raw score qualifies as mild or above
- **Severe** requires at least 2 consecutive days where the raw score qualifies as severe

If the consecutive requirement isn't met, the day is downgraded to "Watch."

## Step 7: Flare Window Detection

Flare windows group consecutive days of elevated activity into discrete events:

- **Start:** First day that reaches validated mild or severe level
- **End:** When the composite score drops below 0.5 for 2 consecutive days
- **Escalation:** Marked if a window transitions from mild to severe

Each window records: start/end dates, peak score and date, duration, average score, dominant symptom, and any patient notes from the period.

## Summary Statistics

The engine also computes:

- **Current status** — What level the most recent day is at
- **Current streak** — How many consecutive days at that level
- **Trend direction** — Compare average composite score of last 7 days vs prior 7 days (improving if diff < -0.2, worsening if > 0.2)
- **Worst symptom** — Which symptom has the highest average EWMA
- **Total flare windows and flare days**

## Constants

| Parameter | Value | Why |
|-----------|-------|-----|
| EWMA alpha | 0.3 | Balances responsiveness vs stability |
| Std dev floor | 0.75 | Prevents infinite Z-scores from low-variance data |
| Baseline window | 14 days | Enough data for stable sigma without flare contamination |
| Watch threshold | 0.8 | ~1 std dev sustained across symptoms |
| Mild threshold | 1.5 | ~1.5 std devs sustained |
| Severe threshold | 2.5 | ~2.5 std devs sustained |
| Exit threshold | 0.5 | Score must drop below this for 2 days to close a window |
| Min logs required | 3 | Need enough data for meaningful statistics |

## Explainability

For each day, the engine computes `contributingSymptoms` — a list of all 4 symptoms sorted by their contribution (`EWMA * weight`) to the composite score. This powers the "Why was this flagged?" section in the UI, showing exactly which symptoms drove each flare event and by how much.
