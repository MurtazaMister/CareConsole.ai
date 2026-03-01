import type { BaselineProfile } from '../types/baseline'
import type { DailyLog } from '../types/dailyLog'
import type { MetricDefinition } from '../types/schema'

// ── Types ────────────────────────────────────────────────────

export type FlareLevel = 'none' | 'watch' | 'mild' | 'severe'

export interface DayAnalysis {
  date: string
  zScores: Record<string, number>
  positiveZ: Record<string, number>
  ewma: Record<string, number>
  compositeScore: number
  rawFlareLevel: FlareLevel
  validatedFlareLevel: FlareLevel
  contributingSymptoms: {
    key: string
    label: string
    zScore: number
    ewma: number
    weight: number
    contribution: number
  }[]
}

export interface FlareWindow {
  id: string
  startDate: string
  endDate: string | null
  peakDate: string
  peakScore: number
  peakLevel: FlareLevel
  escalated: boolean
  escalationDate?: string
  durationDays: number
  avgScore: number
  dominantSymptom: string
  triggerNotes: string[]
}

export interface FlareEngineResult {
  dailyAnalysis: DayAnalysis[]
  flareWindows: FlareWindow[]
  baselineStats: {
    means: Record<string, number>
    stdDevs: Record<string, number>
    logCount: number
  }
  summary: {
    totalFlareWindows: number
    totalFlareDays: number
    severeFlareDays: number
    currentStatus: FlareLevel
    currentStreak: number
    worstSymptom: string
    averageCompositeScore: number
    trendDirection: 'improving' | 'stable' | 'worsening'
  }
}

// ── Default metrics (empty — all metrics now come from schema) ──

// ── Constants ────────────────────────────────────────────────

export const EWMA_ALPHA = 0.3
export const STD_DEV_FLOOR = 0.75

// Thresholds calibrated for weighted-average composite (weights sum to 1.0).
export const COMPOSITE_THRESHOLDS = {
  watch: 0.8,
  mild: 1.5,
  severe: 2.5,
}

// Flare window closes when composite stays below this for 2 consecutive days
export const FLARE_EXIT_THRESHOLD = 0.5

// ── Pure computation functions ───────────────────────────────

export function computeStdDev(values: number[], mean: number): number {
  if (values.length < 2) return STD_DEV_FLOOR
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.max(Math.sqrt(variance), STD_DEV_FLOOR)
}

export function computeZScore(
  value: number,
  mean: number,
  stdDev: number,
): number {
  return (value - mean) / stdDev
}

export function computeEWMA(
  currentPositiveZ: number,
  previousEWMA: number,
  alpha: number = EWMA_ALPHA,
): number {
  return alpha * currentPositiveZ + (1 - alpha) * previousEWMA
}

export function classifyRawFlareLevel(compositeScore: number): FlareLevel {
  if (compositeScore >= COMPOSITE_THRESHOLDS.severe) return 'severe'
  if (compositeScore >= COMPOSITE_THRESHOLDS.mild) return 'mild'
  if (compositeScore >= COMPOSITE_THRESHOLDS.watch) return 'watch'
  return 'none'
}

const FLARE_RANK: Record<FlareLevel, number> = {
  none: 0,
  watch: 1,
  mild: 2,
  severe: 3,
}

// ── Helper to read a metric value from a log ─────────────────

function readLogValue(log: DailyLog, key: string): number {
  const fromResponses = log.responses?.[key]
  if (typeof fromResponses === 'number') return fromResponses
  // Fallback to legacy top-level field
  const legacy = (log as Record<string, unknown>)[key]
  return typeof legacy === 'number' ? legacy : 0
}

function readBaselineValue(baseline: BaselineProfile, key: string | undefined): number {
  if (!key) return 0
  const fromResponses = baseline.responses?.[key]
  if (typeof fromResponses === 'number') return fromResponses
  const legacy = (baseline as Record<string, unknown>)[key]
  return typeof legacy === 'number' ? legacy : 0
}

// ── Multi-day analysis ───────────────────────────────────────

function computeCompositeScore(
  ewmaValues: Record<string, number>,
  keys: string[],
  weights: Record<string, number>,
): number {
  return keys.reduce(
    (sum, key) => sum + ewmaValues[key] * weights[key],
    0,
  )
}

function buildContributingSymptoms(
  ewma: Record<string, number>,
  zScores: Record<string, number>,
  metrics: MetricDefinition[],
) {
  return metrics.map((m) => ({
    key: m.key,
    label: m.label,
    zScore: zScores[m.key],
    ewma: ewma[m.key],
    weight: m.weight,
    contribution: ewma[m.key] * m.weight,
  })).sort((a, b) => b.contribution - a.contribution)
}

function computeDailyAnalysis(
  sortedLogs: DailyLog[],
  means: Record<string, number>,
  stdDevs: Record<string, number>,
  metrics: MetricDefinition[],
): DayAnalysis[] {
  const results: DayAnalysis[] = []
  const keys = metrics.map((m) => m.key)
  const weights = Object.fromEntries(metrics.map((m) => [m.key, m.weight]))

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i]

    // Z-scores
    const zScores: Record<string, number> = {}
    const positiveZ: Record<string, number> = {}
    for (const key of keys) {
      zScores[key] = computeZScore(readLogValue(log, key), means[key], stdDevs[key])
      positiveZ[key] = Math.max(0, zScores[key])
    }

    // EWMA
    const ewma: Record<string, number> = {}
    if (i === 0) {
      for (const key of keys) {
        ewma[key] = positiveZ[key]
      }
    } else {
      const prev = results[i - 1]
      for (const key of keys) {
        ewma[key] = computeEWMA(positiveZ[key], prev.ewma[key])
      }
    }

    const compositeScore = computeCompositeScore(ewma, keys, weights)
    const rawFlareLevel = classifyRawFlareLevel(compositeScore)

    results.push({
      date: log.date,
      zScores,
      positiveZ,
      ewma,
      compositeScore,
      rawFlareLevel,
      validatedFlareLevel: rawFlareLevel,
      contributingSymptoms: buildContributingSymptoms(ewma, zScores, metrics),
    })
  }

  return results
}

export function validateFlareLevels(days: DayAnalysis[]): DayAnalysis[] {
  for (let i = 0; i < days.length; i++) {
    const raw = days[i].rawFlareLevel
    if (raw === 'none' || raw === 'watch') {
      days[i].validatedFlareLevel = raw
      continue
    }

    const rawRank = FLARE_RANK[raw]
    const prevOk =
      i > 0 && FLARE_RANK[days[i - 1].rawFlareLevel] >= rawRank
    const nextOk =
      i < days.length - 1 &&
      FLARE_RANK[days[i + 1].rawFlareLevel] >= rawRank

    if (prevOk || nextOk) {
      days[i].validatedFlareLevel = raw
    } else {
      days[i].validatedFlareLevel = 'watch'
    }
  }
  return days
}

export function identifyFlareWindows(
  days: DayAnalysis[],
  logs: DailyLog[],
  metrics: MetricDefinition[],
): FlareWindow[] {
  const windows: FlareWindow[] = []
  let windowStart = -1
  let belowCount = 0
  let windowId = 0

  for (let i = 0; i < days.length; i++) {
    const level = days[i].validatedFlareLevel

    if (windowStart === -1) {
      if (level === 'mild' || level === 'severe') {
        windowStart = i
        belowCount = 0
      }
    } else {
      if (days[i].compositeScore < FLARE_EXIT_THRESHOLD) {
        belowCount++
        if (belowCount >= 2) {
          const endIdx = i - 2
          windows.push(
            buildFlareWindow(windowId++, days, logs, windowStart, endIdx, metrics),
          )
          windowStart = -1
          belowCount = 0
        }
      } else {
        belowCount = 0
      }
    }
  }

  if (windowStart !== -1) {
    windows.push(
      buildFlareWindow(
        windowId++,
        days,
        logs,
        windowStart,
        days.length - 1,
        metrics,
        true,
      ),
    )
  }

  return windows
}

function buildFlareWindow(
  id: number,
  days: DayAnalysis[],
  logs: DailyLog[],
  startIdx: number,
  endIdx: number,
  metrics: MetricDefinition[],
  ongoing: boolean = false,
): FlareWindow {
  const windowDays = days.slice(startIdx, endIdx + 1)
  const windowLogs = logs.slice(startIdx, endIdx + 1)

  let peakIdx = 0
  for (let i = 1; i < windowDays.length; i++) {
    if (windowDays[i].compositeScore > windowDays[peakIdx].compositeScore) {
      peakIdx = i
    }
  }

  let escalated = false
  let escalationDate: string | undefined
  let seenMild = false
  for (const d of windowDays) {
    if (d.validatedFlareLevel === 'mild') seenMild = true
    if (seenMild && d.validatedFlareLevel === 'severe') {
      escalated = true
      escalationDate = d.date
      break
    }
  }

  // Determine dominant symptom (highest average EWMA contribution)
  const keys = metrics.map((m) => m.key)
  const weights = Object.fromEntries(metrics.map((m) => [m.key, m.weight]))
  const avgContribution: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]))
  for (const d of windowDays) {
    for (const key of keys) {
      avgContribution[key] += d.ewma[key] * weights[key]
    }
  }
  const dominantSymptom = keys.reduce((best, key) =>
    avgContribution[key] > avgContribution[best] ? key : best,
  )

  const triggerNotes = windowLogs
    .filter((l) => l.notes && l.notes.trim().length > 0)
    .map((l) => l.notes)

  const avgScore =
    windowDays.reduce((s, d) => s + d.compositeScore, 0) / windowDays.length

  return {
    id: `flare-${id}`,
    startDate: windowDays[0].date,
    endDate: ongoing ? null : windowDays[windowDays.length - 1].date,
    peakDate: windowDays[peakIdx].date,
    peakScore: windowDays[peakIdx].compositeScore,
    peakLevel: windowDays[peakIdx].validatedFlareLevel,
    escalated,
    escalationDate,
    durationDays: windowDays.length,
    avgScore,
    dominantSymptom,
    triggerNotes,
  }
}

// ── Summary computation ──────────────────────────────────────

function computeSummary(
  days: DayAnalysis[],
  windows: FlareWindow[],
  metrics: MetricDefinition[],
): FlareEngineResult['summary'] {
  const flareDays = days.filter(
    (d) =>
      d.validatedFlareLevel === 'mild' || d.validatedFlareLevel === 'severe',
  )
  const severeDays = days.filter(
    (d) => d.validatedFlareLevel === 'severe',
  )

  const currentStatus =
    days.length > 0 ? days[days.length - 1].validatedFlareLevel : 'none'
  let currentStreak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].validatedFlareLevel === currentStatus) {
      currentStreak++
    } else {
      break
    }
  }

  // Worst symptom (highest average EWMA across all days)
  const keys = metrics.map((m) => m.key)
  const avgEWMA: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]))
  for (const d of days) {
    for (const key of keys) {
      avgEWMA[key] += d.ewma[key]
    }
  }
  if (days.length > 0) {
    for (const key of keys) {
      avgEWMA[key] /= days.length
    }
  }
  const worstSymptom = keys.length > 0
    ? keys.reduce((best, key) => avgEWMA[key] > avgEWMA[best] ? key : best)
    : ''

  const averageCompositeScore =
    days.length > 0
      ? days.reduce((s, d) => s + d.compositeScore, 0) / days.length
      : 0

  let trendDirection: 'improving' | 'stable' | 'worsening' = 'stable'
  if (days.length >= 14) {
    const recent7 = days.slice(-7)
    const prior7 = days.slice(-14, -7)
    const recentAvg =
      recent7.reduce((s, d) => s + d.compositeScore, 0) / 7
    const priorAvg =
      prior7.reduce((s, d) => s + d.compositeScore, 0) / 7
    const diff = recentAvg - priorAvg
    if (diff < -0.2) trendDirection = 'improving'
    else if (diff > 0.2) trendDirection = 'worsening'
  } else if (days.length >= 4) {
    const mid = Math.floor(days.length / 2)
    const recent = days.slice(mid)
    const prior = days.slice(0, mid)
    const recentAvg =
      recent.reduce((s, d) => s + d.compositeScore, 0) / recent.length
    const priorAvg =
      prior.reduce((s, d) => s + d.compositeScore, 0) / prior.length
    const diff = recentAvg - priorAvg
    if (diff < -0.2) trendDirection = 'improving'
    else if (diff > 0.2) trendDirection = 'worsening'
  }

  return {
    totalFlareWindows: windows.length,
    totalFlareDays: flareDays.length,
    severeFlareDays: severeDays.length,
    currentStatus,
    currentStreak,
    worstSymptom,
    averageCompositeScore,
    trendDirection,
  }
}

// ── Main entry point ─────────────────────────────────────────

export function runFlareEngine(
  sortedLogs: DailyLog[],
  baseline: BaselineProfile,
  metrics: MetricDefinition[] = [],
): FlareEngineResult {
  const keys = metrics.map((m) => m.key)

  // Baseline means
  const means: Record<string, number> = {}
  for (const m of metrics) {
    means[m.key] = readBaselineValue(baseline, m.baselineKey ?? m.key)
  }

  // Standard deviations from the baseline window (first 14 days)
  const BASELINE_WINDOW = Math.min(14, sortedLogs.length)
  const baselineWindow = sortedLogs.slice(0, BASELINE_WINDOW)
  const stdDevs: Record<string, number> = {}
  for (const key of keys) {
    const values = baselineWindow.map((l) => readLogValue(l, key))
    stdDevs[key] = computeStdDev(values, means[key])
  }

  // Compute daily analysis
  let dailyAnalysis = computeDailyAnalysis(sortedLogs, means, stdDevs, metrics)

  // Validate flare levels (consecutive-day requirement)
  dailyAnalysis = validateFlareLevels(dailyAnalysis)

  // Identify flare windows
  const flareWindows = identifyFlareWindows(dailyAnalysis, sortedLogs, metrics)

  // Compute summary
  const summary = computeSummary(dailyAnalysis, flareWindows, metrics)

  return {
    dailyAnalysis,
    flareWindows,
    baselineStats: {
      means,
      stdDevs,
      logCount: sortedLogs.length,
    },
    summary,
  }
}
