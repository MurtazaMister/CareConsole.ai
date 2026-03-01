import { useState } from 'react'
import type { Tab } from './TabBar'
import { useFlareEngine } from '../hooks/useFlareEngine'
import { useFilteredLogs } from '../hooks/useFilteredLogs'
import { SYMPTOM_METRICS } from '../types/baseline'
import type { DateRangeKey } from '../constants/chartTheme'
import FlareStatusBanner from './insights/FlareStatusBanner'
import FlareSummaryCards from './insights/FlareSummaryCards'
import CompositeScoreChart from './insights/CompositeScoreChart'
import SymptomEWMAChart from './insights/SymptomEWMAChart'
import FlareTimeline from './insights/FlareTimeline'
import FlareEventCard from './insights/FlareEventCard'
import ChartSection from './charts/ChartSection'
import DateRangeSelector from './charts/DateRangeSelector'
import MetricToggle from './charts/MetricToggle'

interface InsightsTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function InsightsTab({ onSwitchTab }: InsightsTabProps) {
  const flareResult = useFlareEngine()
  const [range, setRange] = useState<DateRangeKey>('all')
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(
    new Set(SYMPTOM_METRICS.map((m) => m.key)),
  )
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

  const filteredLogs = useFilteredLogs(range)

  if (!flareResult) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">Not enough data yet</h3>
        <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">
          Log at least 3 days of symptoms to unlock flare detection insights.
        </p>
        <button
          onClick={() => onSwitchTab('log')}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Log Today
        </button>
      </div>
    )
  }

  // Filter daily analysis to match the selected date range
  const filteredDates = new Set(filteredLogs.map((l) => l.date))
  const filteredAnalysis = flareResult.dailyAnalysis.filter((d) =>
    filteredDates.has(d.date),
  )

  // Filter flare windows to those overlapping the filtered date range
  const firstDate = filteredLogs[0]?.date
  const lastDate = filteredLogs[filteredLogs.length - 1]?.date
  const filteredWindows = firstDate && lastDate
    ? flareResult.flareWindows.filter((fw) => {
        const fwEnd = fw.endDate ?? lastDate
        return fw.startDate <= lastDate && fwEnd >= firstDate
      })
    : []

  const latestAnalysis = flareResult.dailyAnalysis[flareResult.dailyAnalysis.length - 1]

  return (
    <div className="space-y-4">
      {/* Methodology — up top so doctors/researchers understand the approach first */}
      <ChartSection title="How does flare detection work?" defaultOpen={false}>
        <div className="text-sm text-text-muted space-y-4">
          <p>We compare your daily symptoms against your personal baseline to detect when things are getting worse — and whether it's a one-off bad day or a real flare.</p>

          <ol className="space-y-2 list-decimal list-inside">
            <li>
              <span className="font-medium text-text">Measure the gap</span> — For each symptom, we calculate how far today's value is from your normal, measured in standard deviations (Z-Score).
            </li>
            <li>
              <span className="font-medium text-text">Smooth out noise</span> — A single bad day doesn't mean a flare. We use exponential smoothing (EWMA) so only sustained worsening builds up the signal.
            </li>
            <li>
              <span className="font-medium text-text">Combine into one score</span> — All 4 symptoms are weighted together (Pain 30%, Fatigue 25%, Breathing 25%, Function 20%) into a single composite flare score.
            </li>
            <li>
              <span className="font-medium text-text">Require consistency</span> — A flare is only flagged when the score stays elevated for 2+ consecutive days, filtering out random spikes.
            </li>
          </ol>

          <p className="text-xs italic pt-2 border-t border-border">This is a pattern detection tool, not medical advice. Always consult your healthcare provider.</p>
        </div>
      </ChartSection>

      {/* Status Banner */}
      <FlareStatusBanner
        currentStatus={flareResult.summary.currentStatus}
        currentStreak={flareResult.summary.currentStreak}
        trendDirection={flareResult.summary.trendDirection}
        latestScore={latestAnalysis?.compositeScore ?? 0}
      />

      {/* Summary Cards */}
      <FlareSummaryCards
        summary={flareResult.summary}
        totalDays={flareResult.dailyAnalysis.length}
      />

      {/* Date Range Selector */}
      <div className="sticky top-[140px] z-10 bg-white/90 backdrop-blur-sm border border-border shadow-sm -mx-1 px-4 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-text">Analysis</h3>
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Composite Flare Score */}
      <ChartSection title="Composite Flare Score">
        <CompositeScoreChart
          dailyAnalysis={filteredAnalysis}
          flareWindows={filteredWindows}
        />
      </ChartSection>

      {/* Symptom Signals (EWMA) */}
      <ChartSection title="Symptom Signals (EWMA)">
        <div className="mb-3">
          <MetricToggle active={activeMetrics} onChange={setActiveMetrics} />
        </div>
        <SymptomEWMAChart
          dailyAnalysis={filteredAnalysis}
          activeMetrics={activeMetrics}
        />
      </ChartSection>

      {/* Flare Timeline */}
      {filteredWindows.length > 0 && (
        <ChartSection title="Flare Timeline">
          <FlareTimeline
            flareWindows={filteredWindows}
            totalDateRange={{
              start: firstDate ?? '',
              end: lastDate ?? '',
            }}
            onSelectWindow={setSelectedWindowId}
            selectedWindowId={selectedWindowId}
          />
        </ChartSection>
      )}

      {/* Detected Events */}
      {filteredWindows.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text">Detected Events</h3>
          {filteredWindows.map((fw) => (
            <FlareEventCard
              key={fw.id}
              window={fw}
              dailyAnalysis={flareResult.dailyAnalysis.filter(
                (d) =>
                  d.date >= fw.startDate &&
                  d.date <= (fw.endDate ?? '9999-12-31'),
              )}
              isExpanded={selectedWindowId === fw.id}
              onToggle={() =>
                setSelectedWindowId(
                  selectedWindowId === fw.id ? null : fw.id,
                )
              }
            />
          ))}
        </div>
      )}

    </div>
  )
}
