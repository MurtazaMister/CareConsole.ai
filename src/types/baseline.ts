// ── Baseline Profile (one-time setup) ─────────────────────

export interface BaselineProfile {
  // Condition info
  primaryCondition: string
  conditionDurationMonths: number

  // Effective date of this baseline (YYYY-MM-DD)
  baselineDate: string

  // Locked disease-specific metrics (set during onboarding, never changes)
  finalMetrics?: string[]

  // Sleep
  sleepHours: number            // 0–24
  sleepQuality: number          // 1–5 Likert
  usualBedtime: string          // HH:MM
  usualWakeTime: string         // HH:MM

  // Dynamic schema responses (key-value store for all metric baseline values)
  responses?: Record<string, unknown>

  createdAt: string
}

// ── Sleep quality labels (1–5 Likert) ─────────────────────

export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Very Good',
}
