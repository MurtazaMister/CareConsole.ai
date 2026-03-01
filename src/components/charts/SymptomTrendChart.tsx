import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { SYMPTOM_METRICS } from '../../types/baseline'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import type { DailyLog } from '../../types/dailyLog'

interface SymptomTrendChartProps {
  logs: DailyLog[]
  activeMetrics: Set<string>
}

export default function SymptomTrendChart({ logs, activeMetrics }: SymptomTrendChartProps) {
  const data = useMemo(
    () =>
      logs.map((log) => ({
        date: new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        ...Object.fromEntries(
          SYMPTOM_METRICS.map((m) => [m.key, log[m.key]]),
        ),
      })),
    [logs],
  )

  if (logs.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 logs to show trends
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid {...CHART_GRID_STYLE} />
        <XAxis dataKey="date" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        {SYMPTOM_METRICS.filter((m) => activeMetrics.has(m.key)).map((metric) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={metric.label}
            stroke={metric.color}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: 'white' }}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
