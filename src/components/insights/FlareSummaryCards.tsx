import { SYMPTOM_METRICS } from '../../types/baseline'
import type { FlareEngineResult, SymptomKey } from '../../lib/flareEngine'

interface FlareSummaryCardsProps {
  summary: FlareEngineResult['summary']
  totalDays: number
}

const SYMPTOM_LABEL_MAP = Object.fromEntries(
  SYMPTOM_METRICS.map((m) => [m.key, m.label]),
) as Record<SymptomKey, string>

const SYMPTOM_COLOR_MAP = Object.fromEntries(
  SYMPTOM_METRICS.map((m) => [m.key, m.color]),
) as Record<SymptomKey, string>

const TREND_DISPLAY: Record<string, { label: string; arrow: string; color: string }> = {
  improving: { label: 'Improving', arrow: '\u2193', color: 'text-emerald-600' },
  stable: { label: 'Stable', arrow: '\u2192', color: 'text-amber-600' },
  worsening: { label: 'Worsening', arrow: '\u2191', color: 'text-red-600' },
}

export default function FlareSummaryCards({ summary, totalDays }: FlareSummaryCardsProps) {
  const flarePercent = totalDays > 0
    ? Math.round((summary.totalFlareDays / totalDays) * 100)
    : 0
  const trend = TREND_DISPLAY[summary.trendDirection]

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Flare Windows */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <p className="text-xs text-text-muted mb-1">Flare Windows</p>
        <p className="text-2xl font-bold text-text">{summary.totalFlareWindows}</p>
        <p className="text-xs text-text-muted mt-1">
          detected in {totalDays} days
        </p>
      </div>

      {/* Flare Days */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <p className="text-xs text-text-muted mb-1">Flare Days</p>
        <p className="text-2xl font-bold text-text">
          {summary.totalFlareDays}
          <span className="text-sm font-normal text-text-muted ml-1">/ {totalDays}</span>
        </p>
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-400 transition-all duration-500"
            style={{ width: `${Math.min(flarePercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-1">{flarePercent}% of tracked days</p>
      </div>

      {/* Worst Symptom */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <p className="text-xs text-text-muted mb-1">Most Affected</p>
        <p className="text-lg font-bold" style={{ color: SYMPTOM_COLOR_MAP[summary.worstSymptom] }}>
          {SYMPTOM_LABEL_MAP[summary.worstSymptom]}
        </p>
        <p className="text-xs text-text-muted mt-1">
          highest average signal
        </p>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-2xl border border-border p-4">
        <p className="text-xs text-text-muted mb-1">7-Day Trend</p>
        <p className={`text-lg font-bold ${trend.color}`}>
          {trend.arrow} {trend.label}
        </p>
        <p className="text-xs text-text-muted mt-1">
          avg score: {summary.averageCompositeScore.toFixed(1)}
        </p>
      </div>
    </div>
  )
}
