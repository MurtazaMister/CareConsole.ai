// Dynamic deviation and flare risk computation
// Accepts any set of metric keys — no hardcoded symptoms

interface RedFlags {
  chestPainWeaknessConfusion: boolean
  feverSweatsChills: boolean
  missedOrNewMedication: boolean
}

/** Read a numeric value from a responses map (handles Mongoose Map + plain object) */
function readResponse(responses: unknown, key: string): number {
  if (!responses) return 0
  const map = responses as Map<string, unknown> | Record<string, unknown>
  const val = typeof (map as Map<string, unknown>).get === 'function'
    ? (map as Map<string, unknown>).get(key)
    : (map as Record<string, unknown>)[key]
  return typeof val === 'number' ? val : 0
}

export function calculateDeviation(
  logResponses: unknown,
  baselineResponses: unknown,
  activeMetrics: string[],
): { perMetric: Record<string, number>; total: number } {
  const perMetric: Record<string, number> = {}
  for (const key of activeMetrics) {
    perMetric[key] = readResponse(logResponses, key) - readResponse(baselineResponses, key)
  }
  const total = Object.values(perMetric).reduce((sum, v) => sum + Math.abs(v), 0)
  return { perMetric, total }
}

export function calculateFlareRisk(
  deviationTotal: number,
  perMetric: Record<string, number>,
  redFlags?: RedFlags,
  metricCount: number = 4,
): 'low' | 'medium' | 'high' {
  if (redFlags && Object.values(redFlags).some(Boolean)) return 'high'
  const maxSingleDeviation = Math.max(...Object.values(perMetric).map(Math.abs))
  // Scale thresholds proportionally to the number of metrics
  const scale = metricCount / 4
  if (deviationTotal > 10 * scale || maxSingleDeviation >= 4) return 'high'
  if (deviationTotal >= 6 * scale) return 'medium'
  return 'low'
}
