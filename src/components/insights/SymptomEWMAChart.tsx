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
import type { DayAnalysis } from '../../lib/flareEngine'

interface SymptomEWMAChartProps {
  dailyAnalysis: DayAnalysis[]
  activeMetrics: Set<string>
}

export default function SymptomEWMAChart({ dailyAnalysis, activeMetrics }: SymptomEWMAChartProps) {
  const data = useMemo(
    () =>
      dailyAnalysis.map((d) => ({
        date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        ...Object.fromEntries(
          SYMPTOM_METRICS.map((m) => [
            m.key,
            Math.round(d.ewma[m.key as keyof typeof d.ewma] * 100) / 100,
          ]),
        ),
      })),
    [dailyAnalysis],
  )

  if (dailyAnalysis.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 days of data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid {...CHART_GRID_STYLE} />
        <XAxis dataKey="date" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        {SYMPTOM_METRICS.filter((m) => activeMetrics.has(m.key)).map((metric) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={`${metric.label} (EWMA)`}
            stroke={metric.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
