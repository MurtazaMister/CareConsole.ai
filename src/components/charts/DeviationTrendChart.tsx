import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import type { DailyLog } from '../../types/dailyLog'

interface DeviationTrendChartProps {
  logs: DailyLog[]
}

export default function DeviationTrendChart({ logs }: DeviationTrendChartProps) {
  const data = useMemo(
    () =>
      logs.map((log) => ({
        ...log,
        dateLabel: new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
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

  const maxDev = Math.max(...logs.map((l) => l.deviationScore), 15)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="devGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...CHART_GRID_STYLE} />
        <XAxis dataKey="dateLabel" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, Math.ceil(maxDev)]} tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <Tooltip
          {...CHART_TOOLTIP_STYLE}
          formatter={(value) => [`${value}`, 'Deviation']}
        />
        <Area
          type="monotone"
          dataKey="deviationScore"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#devGradient)"
          dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: 'white' }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: '#6366f1', fill: 'white' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
