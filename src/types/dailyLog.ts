import type { BaselineProfile } from './baseline'

// ── Daily Log Entry ───────────────────────────────────────

export interface DailyLog {
  date: string // YYYY-MM-DD

  // Core symptoms (NRS 0–10, same as baseline)
  painLevel: number
  fatigueLevel: number
  breathingDifficulty: number
  functionalLimitation: number

  // Red flags (binary — safety critical)
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
  flareRiskLevel: FlareRisk

  createdAt: string
}

export type FlareRisk = 'low' | 'medium' | 'high'

// ── Red flag definitions ──────────────────────────────────

export const RED_FLAGS = [
  {
    key: 'chestPainWeaknessConfusion' as const,
    label: 'Sudden chest pain, severe weakness, or confusion?',
    icon: '🚨',
  },
  {
    key: 'feverSweatsChills' as const,
    label: 'New fever, sweats, or chills?',
    icon: '🤒',
  },
  {
    key: 'missedOrNewMedication' as const,
    label: 'Missed any medications or started a new one?',
    icon: '💊',
  },
]

// ── Deviation & flare logic ───────────────────────────────

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

export function calculateFlareRisk(
  deviationTotal: number,
  perMetric: Record<string, number>,
  redFlags?: DailyLog['redFlags'],
): FlareRisk {
  // Any red flag = immediate high risk
  if (redFlags && Object.values(redFlags).some(Boolean)) return 'high'

  const maxSingleDeviation = Math.max(...Object.values(perMetric).map(Math.abs))
  if (deviationTotal > 10 || maxSingleDeviation >= 4) return 'high'
  if (deviationTotal >= 6) return 'medium'
  return 'low'
}

export const FLARE_RISK_CONFIG: Record<FlareRisk, { label: string; color: string; icon: string }> = {
  low: { label: 'Low Risk', color: '#10b981', icon: '✅' },
  medium: { label: 'Medium Risk', color: '#f59e0b', icon: '⚠️' },
  high: { label: 'High Risk', color: '#ef4444', icon: '🔴' },
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
