import type { BaselineProfile } from './baseline'

// ── Daily Log Entry ───────────────────────────────────────

export interface DailyLog {
  date: string // YYYY-MM-DD

  // Core symptoms (NRS 0–10, same as baseline)
  painLevel: number
  fatigueLevel: number
  breathingDifficulty: number
  functionalLimitation: number

  // Health check-in (binary)
  redFlags: {
    chestPainWeaknessConfusion: boolean
    feverSweatsChills: boolean
    missedOrNewMedication: boolean
  }

  // Sleep (last night)
  sleepHours: number
  sleepQuality: number  // 1–5 Likert
  bedtime: string       // HH:MM
  wakeTime: string      // HH:MM

  // Free text (max 150 chars)
  notes: string

  // Computed on save
  deviationScore: number

  createdAt: string
}

// ── Health check-in definitions ───────────────────────────

export const HEALTH_CHECKS = [
  {
    key: 'chestPainWeaknessConfusion' as const,
    label: 'Sudden chest pain, severe weakness, or confusion?',
  },
  {
    key: 'feverSweatsChills' as const,
    label: 'New fever, sweats, or chills?',
  },
  {
    key: 'missedOrNewMedication' as const,
    label: 'Missed any medications or started a new one?',
  },
]

// ── Deviation logic ──────────────────────────────────────

const CORE_KEYS = [
  'painLevel',
  'fatigueLevel',
  'breathingDifficulty',
  'functionalLimitation',
] as const

export function calculateDeviation(
  log: Pick<DailyLog, 'painLevel' | 'fatigueLevel' | 'breathingDifficulty' | 'functionalLimitation'>,
  baseline: BaselineProfile,
): { perMetric: Record<string, number>; total: number } {
  const perMetric: Record<string, number> = {}
  for (const key of CORE_KEYS) {
    perMetric[key] = log[key] - baseline[key]
  }
  const total = Object.values(perMetric).reduce((sum, v) => sum + Math.abs(v), 0)
  return { perMetric, total }
}

// ── Helpers ───────────────────────────────────────────────

export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getTodayDateString(): string {
  return formatDateString(new Date())
}

export function createEmptyLogForm(baseline?: BaselineProfile) {
  return {
    painLevel: baseline?.painLevel ?? 0,
    fatigueLevel: baseline?.fatigueLevel ?? 0,
    breathingDifficulty: baseline?.breathingDifficulty ?? 0,
    functionalLimitation: baseline?.functionalLimitation ?? 0,
    redFlags: {
      chestPainWeaknessConfusion: false,
      feverSweatsChills: false,
      missedOrNewMedication: false,
    },
    sleepHours: baseline?.sleepHours ?? 7,
    sleepQuality: baseline?.sleepQuality ?? 3,
    bedtime: baseline?.usualBedtime ?? '22:00',
    wakeTime: baseline?.usualWakeTime ?? '06:00',
    notes: '',
  }
}
