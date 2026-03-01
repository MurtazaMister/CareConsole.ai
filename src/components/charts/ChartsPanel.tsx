import { useState } from 'react'
import { useBaseline } from '../../hooks/useBaseline'
import { useLogs } from '../../hooks/useLogs'
import { useFilteredLogs } from '../../hooks/useFilteredLogs'
import { SYMPTOM_METRICS } from '../../types/baseline'
import type { DateRangeKey } from '../../constants/chartTheme'
import ChartSection from './ChartSection'
import DateRangeSelector from './DateRangeSelector'
import MetricToggle from './MetricToggle'
import SymptomTrendChart from './SymptomTrendChart'
import DeviationTrendChart from './DeviationTrendChart'
import SymptomRadarChart from './SymptomRadarChart'
import FlareRiskPieChart from './FlareRiskPieChart'
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

  if (!baseline || logs.length < 2) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-text">Trends & Insights</h3>
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Row 1: Radar + Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartSection title="Today vs Baseline">
          <SymptomRadarChart baseline={baseline} todayLog={todayLog} />
        </ChartSection>
        <ChartSection title="Risk Distribution">
          <FlareRiskPieChart logs={filteredLogs} />
        </ChartSection>
      </div>

      {/* Row 2: Symptom Trends */}
      <ChartSection title="Symptom Trends">
        <div className="mb-3">
          <MetricToggle active={activeMetrics} onChange={setActiveMetrics} />
        </div>
        <SymptomTrendChart logs={filteredLogs} activeMetrics={activeMetrics} />
      </ChartSection>

      {/* Row 3: Deviation Trend */}
      <ChartSection title="Overall Deviation">
        <DeviationTrendChart logs={filteredLogs} />
      </ChartSection>

      {/* Row 4: Sleep (collapsed by default) */}
      <ChartSection title="Sleep Patterns" defaultOpen={false}>
        <SleepChart logs={filteredLogs} />
      </ChartSection>
    </div>
  )
}
