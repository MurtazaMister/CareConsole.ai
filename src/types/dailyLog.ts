// ── Daily Log Entry ───────────────────────────────────────

export interface DailyLog {
  date: string // YYYY-MM-DD

  // Metric category snapshots (from UserSchema at time of logging)
  finalMetrics?: string[]
  transientMetrics?: string[]
  tombstoneMetrics?: string[]

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

  // Free text
  notes: string

  // Dynamic schema responses (key-value store for all metric values)
  responses?: Record<string, unknown>

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

// ── Helpers ───────────────────────────────────────────────

export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getTodayDateString(): string {
  return formatDateString(new Date())
}

export function createEmptyLogForm() {
  return {
    redFlags: {
      chestPainWeaknessConfusion: false,
      feverSweatsChills: false,
      missedOrNewMedication: false,
    },
    sleepHours: 7,
    sleepQuality: 3,
    bedtime: '22:00',
    wakeTime: '06:00',
    notes: '',
  }
}
