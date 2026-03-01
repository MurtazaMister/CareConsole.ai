import type { BaselineProfile } from '../types/baseline'
import type { DailyLog } from '../types/dailyLog'
import { SYMPTOM_METRICS } from '../types/baseline'

// ── Types ────────────────────────────────────────────────────

export type SymptomKey =
  | 'painLevel'
  | 'fatigueLevel'
  | 'breathingDifficulty'
  | 'functionalLimitation'

export type FlareLevel = 'none' | 'watch' | 'mild' | 'severe'

export interface DayAnalysis {
  date: string
  zScores: Record<SymptomKey, number>
  positiveZ: Record<SymptomKey, number>
  ewma: Record<SymptomKey, number>
  compositeScore: number
  rawFlareLevel: FlareLevel
  validatedFlareLevel: FlareLevel
  contributingSymptoms: {
    key: SymptomKey
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
  dominantSymptom: SymptomKey
  triggerNotes: string[]
}

export interface FlareEngineResult {
  dailyAnalysis: DayAnalysis[]
  flareWindows: FlareWindow[]
  baselineStats: {
    means: Record<SymptomKey, number>
    stdDevs: Record<SymptomKey, number>
    logCount: number
  }
  summary: {
    totalFlareWindows: number
    totalFlareDays: number
    severeFlareDays: number
    currentStatus: FlareLevel
    currentStreak: number
    worstSymptom: SymptomKey
    averageCompositeScore: number
    trendDirection: 'improving' | 'stable' | 'worsening'
  }
}

// ── Constants ────────────────────────────────────────────────

export const SYMPTOM_KEYS: SymptomKey[] = [
  'painLevel',
  'fatigueLevel',
  'breathingDifficulty',
  'functionalLimitation',
]

export const FLARE_WEIGHTS: Record<SymptomKey, number> = {
  painLevel: 0.3,
  fatigueLevel: 0.25,
  breathingDifficulty: 0.25,
  functionalLimitation: 0.2,
}

export const EWMA_ALPHA = 0.3
export const STD_DEV_FLOOR = 0.75

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

export function computeCompositeScore(
  ewmaValues: Record<SymptomKey, number>,
): number {
  return SYMPTOM_KEYS.reduce(
    (sum, key) => sum + ewmaValues[key] * FLARE_WEIGHTS[key],
    0,
  )
}

// Thresholds calibrated for weighted-average composite (weights sum to 1.0).
// A composite of 1.5 means the average EWMA across symptoms is ~1.5 std devs
// above baseline — clinically significant for rare disease patients.
export const COMPOSITE_THRESHOLDS = {
  watch: 0.8,
  mild: 1.5,
  severe: 2.5,
}

// Flare window closes when composite stays below this for 2 consecutive days
export const FLARE_EXIT_THRESHOLD = 0.5

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

function buildContributingSymptoms(
  ewma: Record<SymptomKey, number>,
  zScores: Record<SymptomKey, number>,
) {
  const metricLabelMap = Object.fromEntries(
    SYMPTOM_METRICS.map((m) => [m.key, m.label]),
  )
  return SYMPTOM_KEYS.map((key) => ({
    key,
    label: metricLabelMap[key] || key,
    zScore: zScores[key],
    ewma: ewma[key],
    weight: FLARE_WEIGHTS[key],
    contribution: ewma[key] * FLARE_WEIGHTS[key],
  })).sort((a, b) => b.contribution - a.contribution)
}

// ── Multi-day analysis ───────────────────────────────────────

function computeDailyAnalysis(
  sortedLogs: DailyLog[],
  means: Record<SymptomKey, number>,
  stdDevs: Record<SymptomKey, number>,
): DayAnalysis[] {
  const results: DayAnalysis[] = []

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i]

    // Z-scores
    const zScores = {} as Record<SymptomKey, number>
    const positiveZ = {} as Record<SymptomKey, number>
    for (const key of SYMPTOM_KEYS) {
      zScores[key] = computeZScore(log[key], means[key], stdDevs[key])
      positiveZ[key] = Math.max(0, zScores[key])
    }

    // EWMA
    const ewma = {} as Record<SymptomKey, number>
    if (i === 0) {
      for (const key of SYMPTOM_KEYS) {
        ewma[key] = positiveZ[key]
      }
    } else {
      const prev = results[i - 1]
      for (const key of SYMPTOM_KEYS) {
        ewma[key] = computeEWMA(positiveZ[key], prev.ewma[key])
      }
    }

    const compositeScore = computeCompositeScore(ewma)
    const rawFlareLevel = classifyRawFlareLevel(compositeScore)

    results.push({
      date: log.date,
      zScores,
      positiveZ,
      ewma,
      compositeScore,
      rawFlareLevel,
      validatedFlareLevel: rawFlareLevel, // will be overwritten by validation
      contributingSymptoms: buildContributingSymptoms(ewma, zScores),
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

    // For mild/severe: need at least one adjacent day also at that raw level or higher
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
): FlareWindow[] {
  const windows: FlareWindow[] = []
  let windowStart = -1
  let belowCount = 0
  let windowId = 0

  for (let i = 0; i < days.length; i++) {
    const level = days[i].validatedFlareLevel

    if (windowStart === -1) {
      // Not in a window — check if one starts
      if (level === 'mild' || level === 'severe') {
        windowStart = i
        belowCount = 0
      }
    } else {
      // In a window — check if it ends
      if (days[i].compositeScore < FLARE_EXIT_THRESHOLD) {
        belowCount++
        if (belowCount >= 2) {
          // Close window — end is 2 days before current
          const endIdx = i - 2
          windows.push(
            buildFlareWindow(windowId++, days, logs, windowStart, endIdx),
          )
          windowStart = -1
          belowCount = 0
        }
      } else {
        belowCount = 0
      }
    }
  }

  // If still in a window at the end, close it as ongoing
  if (windowStart !== -1) {
    windows.push(
      buildFlareWindow(
        windowId++,
        days,
        logs,
        windowStart,
        days.length - 1,
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
  ongoing: boolean = false,
): FlareWindow {
  const windowDays = days.slice(startIdx, endIdx + 1)
  const windowLogs = logs.slice(startIdx, endIdx + 1)

  // Find peak
  let peakIdx = 0
  for (let i = 1; i < windowDays.length; i++) {
    if (windowDays[i].compositeScore > windowDays[peakIdx].compositeScore) {
      peakIdx = i
    }
  }

  // Check for escalation (mild → severe)
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
  const avgContribution: Record<SymptomKey, number> = {
    painLevel: 0,
    fatigueLevel: 0,
    breathingDifficulty: 0,
    functionalLimitation: 0,
  }
  for (const d of windowDays) {
    for (const key of SYMPTOM_KEYS) {
      avgContribution[key] += d.ewma[key] * FLARE_WEIGHTS[key]
    }
  }
  const dominantSymptom = SYMPTOM_KEYS.reduce((best, key) =>
    avgContribution[key] > avgContribution[best] ? key : best,
  )

  // Collect notes
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
): FlareEngineResult['summary'] {
  const flareDays = days.filter(
    (d) =>
      d.validatedFlareLevel === 'mild' || d.validatedFlareLevel === 'severe',
  )
  const severeDays = days.filter(
    (d) => d.validatedFlareLevel === 'severe',
  )

  // Current status & streak
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
  const avgEWMA: Record<SymptomKey, number> = {
    painLevel: 0,
    fatigueLevel: 0,
    breathingDifficulty: 0,
    functionalLimitation: 0,
  }
  for (const d of days) {
    for (const key of SYMPTOM_KEYS) {
      avgEWMA[key] += d.ewma[key]
    }
  }
  if (days.length > 0) {
    for (const key of SYMPTOM_KEYS) {
      avgEWMA[key] /= days.length
    }
  }
  const worstSymptom = SYMPTOM_KEYS.reduce((best, key) =>
    avgEWMA[key] > avgEWMA[best] ? key : best,
  )

  // Average composite score
  const averageCompositeScore =
    days.length > 0
      ? days.reduce((s, d) => s + d.compositeScore, 0) / days.length
      : 0

  // Trend direction: last 7 days vs prior 7 days
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
    // With fewer days, compare halves
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
): FlareEngineResult {
  // Baseline means (from user-defined baseline profile)
  const means: Record<SymptomKey, number> = {
    painLevel: baseline.painLevel,
    fatigueLevel: baseline.fatigueLevel,
    breathingDifficulty: baseline.breathingDifficulty,
    functionalLimitation: baseline.functionalLimitation,
  }

  // Standard deviations from the baseline window (first 14 days).
  // Using only early data prevents flare days from inflating σ,
  // which would compress Z-scores during the flares we're trying to detect.
  const BASELINE_WINDOW = Math.min(14, sortedLogs.length)
  const baselineWindow = sortedLogs.slice(0, BASELINE_WINDOW)
  const stdDevs: Record<SymptomKey, number> = {} as Record<SymptomKey, number>
  for (const key of SYMPTOM_KEYS) {
    const values = baselineWindow.map((l) => l[key])
    stdDevs[key] = computeStdDev(values, means[key])
  }

  // Compute daily analysis
  let dailyAnalysis = computeDailyAnalysis(sortedLogs, means, stdDevs)

  // Validate flare levels (consecutive-day requirement)
  dailyAnalysis = validateFlareLevels(dailyAnalysis)

  // Identify flare windows
  const flareWindows = identifyFlareWindows(dailyAnalysis, sortedLogs)

  // Compute summary
  const summary = computeSummary(dailyAnalysis, flareWindows)

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
