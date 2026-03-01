import { useState, useMemo } from 'react'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { useFilteredLogs } from '../hooks/useFilteredLogs'
import { useFlareEngine } from '../hooks/useFlareEngine'
import { useSchema } from '../hooks/useSchema'
import type { DateRange } from '../constants/chartTheme'
import type { Tab } from './TabBar'
import ChartSection from './charts/ChartSection'
import DateRangeSelector from './charts/DateRangeSelector'
import MetricToggle from './charts/MetricToggle'
import SymptomTrendChart from './charts/SymptomTrendChart'
import DeviationTrendChart from './charts/DeviationTrendChart'
import SleepChart from './charts/SleepChart'
import WeeklyAveragesChart from './charts/WeeklyAveragesChart'
import SymptomCorrelationChart from './charts/SymptomCorrelationChart'

interface OverviewTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function OverviewTab({ onSwitchTab }: OverviewTabProps) {
  const { baseline } = useBaseline()
  const { logs, getTodayLog } = useLogs()
  const { activeMetrics } = useSchema()
  const [range, setRange] = useState<DateRange>({ preset: '1m', days: 30 })
  const [activeKeys, setActiveKeys] = useState<Set<string>>(
    new Set(activeMetrics.map((m) => m.key)),
  )

  const filteredLogs = useFilteredLogs(range)
  const todayLog = getTodayLog()
  const flareResult = useFlareEngine()

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

  // Build chart data summaries for AI
  const symptomTrendData = useMemo(() =>
    filteredLogs.map((l) => ({
      date: l.date,
      ...Object.fromEntries(activeMetrics.map((m) => [m.label, l.responses?.[m.key] ?? 0])),
    })),
    [filteredLogs, activeMetrics],
  )

  const deviationData = useMemo(() =>
    filteredLogs.map((l) => ({ date: l.date, deviation: l.deviationScore })),
    [filteredLogs],
  )

  const sleepData = useMemo(() =>
    filteredLogs.map((l) => ({
      date: l.date,
      hours: (l.responses?.sleepHours ?? l.sleepHours) as number,
      quality: (l.responses?.sleepQuality ?? l.sleepQuality) as number,
    })),
    [filteredLogs],
  )

  const weeklyData = useMemo(() => {
    const weeks = new Map<string, Record<string, number[]>>()
    for (const log of filteredLogs) {
      const d = new Date(log.date + 'T00:00:00')
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d)
      monday.setDate(diff)
      const key = monday.toISOString().split('T')[0]
      if (!weeks.has(key)) weeks.set(key, {})
      const w = weeks.get(key)!
      for (const m of activeMetrics) {
        if (!w[m.label]) w[m.label] = []
        w[m.label].push((log.responses?.[m.key] ?? 0) as number)
      }
    }
    return [...weeks.entries()].map(([week, metrics]) => ({
      week,
      ...Object.fromEntries(Object.entries(metrics).map(([k, vals]) => [k, Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10])),
    }))
  }, [filteredLogs, activeMetrics])

  const correlationData = useMemo(() =>
    filteredLogs.map((l) => ({
      date: l.date,
      ...Object.fromEntries(activeMetrics.map((m) => [m.label, l.responses?.[m.key] ?? 0])),
      deviation: l.deviationScore,
    })),
    [filteredLogs, activeMetrics],
  )

  if (!baseline) return null

  if (logs.length < 2) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white shadow-lg shadow-primary/20">
          <h2 className="text-xl font-bold mb-1">Your Health History</h2>
          <p className="text-white/70 text-sm mb-4">
            Log at least 2 days to start seeing trends and insights about your health.
          </p>
          {!todayLog && (
            <button
              onClick={() => onSwitchTab('log')}
              className="px-6 py-3 rounded-xl font-semibold text-primary bg-white hover:bg-white/90 hover:shadow-lg transition-all duration-200"
            >
              Log Today
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with date range */}
      <div className="sticky top-[140px] z-10 bg-white/90 backdrop-blur-sm border border-border shadow-sm -mx-1 px-4 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-text">Your Health History</h3>
        <DateRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Symptom Trends */}
      <ChartSection title="Symptom Trends" info="Each line tracks one symptom over time. Use the toggles to show or hide specific symptoms. Shaded areas highlight detected flare windows." chartData={symptomTrendData}>
        <div className="mb-3">
          <MetricToggle active={activeKeys} onChange={setActiveKeys} metrics={activeMetrics} />
        </div>
        <SymptomTrendChart logs={filteredLogs} activeMetrics={activeKeys} flareWindows={visibleFlareWindows} metrics={activeMetrics} />
      </ChartSection>

      {/* Weekly Averages */}
      <ChartSection title="Weekly Averages" info="Average symptom levels grouped by week. Helps you spot gradual improvement or worsening trends that are hard to see day-by-day." chartData={weeklyData}>
        <WeeklyAveragesChart logs={filteredLogs} metrics={activeMetrics} />
      </ChartSection>

      {/* Symptom Correlation */}
      <ChartSection title="Symptom Correlation" info="Pick two symptoms to see if they tend to move together. Each dot is one day. Dots are colored by flare risk. A strong correlation means the symptoms often rise and fall together." defaultOpen={false} chartData={correlationData}>
        <SymptomCorrelationChart logs={filteredLogs} metrics={activeMetrics} />
      </ChartSection>

      {/* Deviation Trend */}
      <ChartSection title="Overall Deviation" info="Shows how far your overall symptoms are from baseline each day. Higher values mean more deviation. Shaded areas highlight detected flare windows." chartData={deviationData}>
        <DeviationTrendChart logs={filteredLogs} flareWindows={visibleFlareWindows} />
      </ChartSection>

      {/* Sleep */}
      <ChartSection title="Sleep Patterns" info="Bars show hours slept each night. The line tracks sleep quality (1-5). Compare against your baseline sleep patterns." defaultOpen={false} chartData={sleepData}>
        <SleepChart logs={filteredLogs} />
      </ChartSection>
    </div>
  )
}
