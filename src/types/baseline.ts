// ── Baseline Profile (one-time setup) ─────────────────────

export interface BaselineProfile {
  // Condition info
  primaryCondition: string
  conditionDurationMonths: number

  // Effective date of this baseline (YYYY-MM-DD)
  baselineDate: string

  // Core symptoms (NRS 0–10, clinically standard)
  painLevel: number
  fatigueLevel: number
  breathingDifficulty: number
  functionalLimitation: number  // how much symptoms prevent normal tasks

  // Sleep
  sleepHours: number            // 0–24
  sleepQuality: number          // 1–5 Likert
  usualBedtime: string          // HH:MM
  usualWakeTime: string         // HH:MM

  createdAt: string
}

// ── Core symptom metrics (shared between baseline & daily) ─

export interface SymptomMetric {
  key: 'painLevel' | 'fatigueLevel' | 'breathingDifficulty' | 'functionalLimitation'
  label: string
  question: string
  dailyQuestion: string
  icon: string
  color: string
  gradient: string
}

export const SYMPTOM_METRICS: SymptomMetric[] = [
  {
    key: 'painLevel',
    label: 'Body Pain',
    question: 'On an average day, what is your overall body pain level?',
    dailyQuestion: 'What is your overall body pain TODAY?',
    icon: '💊',
    color: '#ef4444',
    gradient: 'from-red-400 to-rose-500',
  },
  {
    key: 'fatigueLevel',
    label: 'Fatigue',
    question: 'On an average day, what is your usual level of fatigue?',
    dailyQuestion: 'How fatigued or weak do you feel TODAY?',
    icon: '🔋',
    color: '#f59e0b',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    key: 'breathingDifficulty',
    label: 'Breathing',
    question: 'On an average day, how much difficulty do you have breathing?',
    dailyQuestion: 'How much difficulty are you having breathing TODAY?',
    icon: '🫁',
    color: '#06b6d4',
    gradient: 'from-cyan-400 to-teal-500',
  },
  {
    key: 'functionalLimitation',
    label: 'Task Limitation',
    question: 'On an average day, how much do your symptoms prevent you from doing normal tasks?',
    dailyQuestion: 'How much are your symptoms preventing you from doing normal tasks TODAY?',
    icon: '📋',
    color: '#6366f1',
    gradient: 'from-indigo-400 to-blue-500',
  },
]

// ── Sleep quality labels (1–5 Likert) ─────────────────────

export const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Very Good',
}
