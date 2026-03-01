import { SYMPTOM_METRICS } from '../../types/baseline'
import { FLARE_LEVEL_CONFIG } from '../../constants/flareTheme'
import type { FlareWindow, DayAnalysis, SymptomKey } from '../../lib/flareEngine'

interface FlareEventCardProps {
  window: FlareWindow
  dailyAnalysis: DayAnalysis[]
  isExpanded: boolean
  onToggle: () => void
}

const SYMPTOM_COLOR_MAP = Object.fromEntries(
  SYMPTOM_METRICS.map((m) => [m.key, m.color]),
) as Record<SymptomKey, string>

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function FlareEventCard({
  window: fw,
  dailyAnalysis,
  isExpanded,
  onToggle,
}: FlareEventCardProps) {
  const peakConfig = FLARE_LEVEL_CONFIG[fw.peakLevel]
  const peakDay = dailyAnalysis.find((d) => d.date === fw.peakDate)

  // Get the dominant and secondary contributors from the peak day
  const topContributors = peakDay?.contributingSymptoms.slice(0, 2) ?? []
  const totalContribution = peakDay
    ? peakDay.contributingSymptoms.reduce((s, c) => s + c.contribution, 0)
    : 1

  // Summary text
  const dominantLabel = topContributors[0]?.label ?? ''
  const secondLabel = topContributors[1]?.label ?? ''
  const summaryText =
    topContributors.length >= 2
      ? `${dominantLabel} and ${secondLabel} drove this ${fw.durationDays}-day ${peakConfig.label.toLowerCase()}`
      : `${dominantLabel} drove this ${fw.durationDays}-day ${peakConfig.label.toLowerCase()}`

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Header (always visible) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <svg
            className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-text">
                {formatDate(fw.startDate)} - {fw.endDate ? formatDate(fw.endDate) : 'Ongoing'}
              </span>
              <span className="text-xs text-text-muted">{fw.durationDays}d</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: peakConfig.bgColor, color: peakConfig.color }}
              >
                {peakConfig.label}
              </span>
              {fw.escalated && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                  Escalated
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 truncate">{summaryText}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-text-muted flex-shrink-0 ml-2">
          Peak: {fw.peakScore.toFixed(1)}
        </span>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Why was this flagged? */}
          <div>
            <h4 className="text-sm font-semibold text-text mb-2">Why was this flagged?</h4>
            <p className="text-sm text-text-muted mb-3">
              Your composite flare score exceeded the threshold for{' '}
              <span className="font-medium" style={{ color: peakConfig.color }}>
                {fw.durationDays} consecutive days
              </span>
              , indicating a sustained increase in symptom severity compared to your baseline.
            </p>

            {/* Contributing symptoms bars */}
            <div className="space-y-2">
              {peakDay?.contributingSymptoms.map((cs) => {
                const pct = totalContribution > 0
                  ? Math.round((cs.contribution / totalContribution) * 100)
                  : 0
                return (
                  <div key={cs.key} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-28 flex-shrink-0 truncate">
                      {cs.label}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: SYMPTOM_COLOR_MAP[cs.key],
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-muted w-10 text-right">
                      {pct}%
                    </span>
                    <span className="text-xs text-text-muted w-16 text-right">
                      EWMA: {cs.ewma.toFixed(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Day-by-day table */}
          <div>
            <h4 className="text-sm font-semibold text-text mb-2">Day-by-Day</h4>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface/50">
                    <th className="text-left px-3 py-2 text-text-muted font-medium">Date</th>
                    <th className="text-right px-3 py-2 text-text-muted font-medium">Score</th>
                    <th className="text-right px-3 py-2 text-text-muted font-medium">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyAnalysis.map((d) => {
                    const config = FLARE_LEVEL_CONFIG[d.validatedFlareLevel]
                    const isPeak = d.date === fw.peakDate
                    return (
                      <tr
                        key={d.date}
                        className={`border-t border-border ${isPeak ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-3 py-2 text-text">
                          {formatDate(d.date)}
                          {isPeak && (
                            <span className="ml-1.5 text-[10px] text-primary font-medium">Peak</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-text">
                          {d.compositeScore.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: config.bgColor, color: config.color }}
                          >
                            {config.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Escalation alert */}
          {fw.escalated && fw.escalationDate && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-red-700">
                This flare escalated from mild to severe on {formatDate(fw.escalationDate)}.
              </p>
            </div>
          )}

          {/* Notes from the period */}
          {fw.triggerNotes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text mb-2">Notes from this period</h4>
              <div className="space-y-1.5">
                {fw.triggerNotes.map((note, i) => (
                  <p key={i} className="text-xs text-text-muted italic bg-surface/50 px-3 py-2 rounded-lg">
                    "{note}"
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
