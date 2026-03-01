// Exact port of calculateDeviation + calculateFlareRisk from src/types/dailyLog.ts
// Server is the source of truth for these computations

const CORE_KEYS = ['painLevel', 'fatigueLevel', 'breathingDifficulty', 'functionalLimitation'] as const

interface SymptomValues {
  painLevel: number
  fatigueLevel: number
  breathingDifficulty: number
  functionalLimitation: number
}

interface RedFlags {
  chestPainWeaknessConfusion: boolean
  feverSweatsChills: boolean
  missedOrNewMedication: boolean
}

export function calculateDeviation(
  log: SymptomValues,
  baseline: SymptomValues,
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
  redFlags?: RedFlags,
): 'low' | 'medium' | 'high' {
  if (redFlags && Object.values(redFlags).some(Boolean)) return 'high'
  const maxSingleDeviation = Math.max(...Object.values(perMetric).map(Math.abs))
  if (deviationTotal > 10 || maxSingleDeviation >= 4) return 'high'
  if (deviationTotal >= 6) return 'medium'
  return 'low'
}
