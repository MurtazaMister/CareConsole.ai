import { useState, useMemo } from 'react'
import { useBaseline } from '../../hooks/useBaseline'
import { useLogs } from '../../hooks/useLogs'
import { useFilteredLogs } from '../../hooks/useFilteredLogs'
import { useFlareEngine } from '../../hooks/useFlareEngine'
import { SYMPTOM_METRICS } from '../../types/baseline'
import type { DateRangeKey } from '../../constants/chartTheme'
import ChartSection from './ChartSection'
import DateRangeSelector from './DateRangeSelector'
import MetricToggle from './MetricToggle'
import SymptomTrendChart from './SymptomTrendChart'
import DeviationTrendChart from './DeviationTrendChart'
import SymptomRadarChart from './SymptomRadarChart'
import SleepChart from './SleepChart'

export default function ChartsPanel() {
  const { baseline } = useBaseline()
  const { logs, getTodayLog } = useLogs()
  const [range, setRange] = useState<DateRangeKey>('14d')
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(
    new Set(SYMPTOM_METRICS.map((m) => m.key)),
  )

  const filteredLogs = useFilteredLogs(range)
  const todayLog = getTodayLog()
  const flareResult = useFlareEngine()

  // Filter flare windows to those overlapping the filtered date range
  const visibleFlareWindows = useMemo(() => {
    if (!flareResult?.flareWindows) return undefined
    const firstDate = filteredLogs[0]?.date
    const lastDate = filteredLogs[filteredLogs.length - 1]?.date
    if (!firstDate || !lastDate) return undefined

    return flareResult.flareWindows.filter((fw) => {
      const fwEnd = fw.endDate ?? lastDate
      return fw.startDate <= lastDate && fwEnd >= firstDate
    })
  }, [flareResult, filteredLogs])

  if (!baseline || logs.length < 2) return null

  return (
    <div className="space-y-4">
      <div className="sticky top-[140px] z-10 bg-white/90 backdrop-blur-sm border border-border shadow-sm -mx-1 px-4 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-text">Trends & Insights</h3>
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Row 1: Radar */}
      <ChartSection title="Today vs Baseline" info="Compares today's symptom levels against your baseline. A larger shape means more deviation from your normal.">
        <SymptomRadarChart baseline={baseline} todayLog={todayLog} />
      </ChartSection>

      {/* Row 2: Symptom Trends */}
      <ChartSection title="Symptom Trends" info="Each line tracks one symptom over time. Use the toggles to show or hide specific symptoms. Shaded areas highlight detected flare windows.">
        <div className="mb-3">
          <MetricToggle active={activeMetrics} onChange={setActiveMetrics} />
        </div>
        <SymptomTrendChart logs={filteredLogs} activeMetrics={activeMetrics} flareWindows={visibleFlareWindows} />
      </ChartSection>

      {/* Row 3: Deviation Trend */}
      <ChartSection title="Overall Deviation" info="Shows how far your overall symptoms are from baseline each day. Higher values mean more deviation. Shaded areas highlight detected flare windows.">
        <DeviationTrendChart logs={filteredLogs} flareWindows={visibleFlareWindows} />
      </ChartSection>

      {/* Row 4: Sleep (collapsed by default) */}
      <ChartSection title="Sleep Patterns" info="Bars show hours slept each night. The line tracks sleep quality (1-5). Compare against your baseline sleep patterns." defaultOpen={false}>
        <SleepChart logs={filteredLogs} />
      </ChartSection>
    </div>
  )
}
