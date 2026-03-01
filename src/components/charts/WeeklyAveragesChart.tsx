import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import type { DailyLog } from '../../types/dailyLog'
import type { MetricDefinition } from '../../types/schema'
import MetricToggle from './MetricToggle'

interface WeeklyAveragesChartProps {
  logs: DailyLog[]
  metrics: MetricDefinition[]
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  // Get Monday of this week
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().split('T')[0]
}

export default function WeeklyAveragesChart({ logs, metrics }: WeeklyAveragesChartProps) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(
    new Set(metrics.slice(0, 3).map((m) => m.key)),
  )

  const data = useMemo(() => {
    if (logs.length === 0) return []

    // Group logs by week
    const weekMap = new Map<string, { label: string; sums: Record<string, number>; counts: Record<string, number> }>()

    for (const log of logs) {
      const weekKey = getWeekKey(log.date)
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { label: getWeekLabel(log.date), sums: {}, counts: {} })
      }
      const week = weekMap.get(weekKey)!
      for (const m of metrics) {
        const val = (log.responses?.[m.key] ?? 0) as number
        week.sums[m.key] = (week.sums[m.key] ?? 0) + val
        week.counts[m.key] = (week.counts[m.key] ?? 0) + 1
      }
    }

    // Convert to chart data
    return [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, week]) => {
        const row: Record<string, unknown> = { week: week.label }
        for (const m of metrics) {
          const count = week.counts[m.key] ?? 0
          row[m.key] = count > 0 ? Math.round(((week.sums[m.key] ?? 0) / count) * 10) / 10 : 0
        }
        return row
      })
  }, [logs, metrics])

  if (logs.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 logs to show weekly averages
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <MetricToggle active={activeKeys} onChange={setActiveKeys} metrics={metrics} />
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid {...CHART_GRID_STYLE} />
          <XAxis dataKey="week" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            formatter={(value, name) => [`${value}`, name as string]}
          />
          {metrics
            .filter((m) => activeKeys.has(m.key))
            .map((metric) => (
              <Bar
                key={metric.key}
                dataKey={metric.key}
                name={metric.label}
                fill={metric.color}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
                maxBarSize={28}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
