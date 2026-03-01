import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE, RISK_COLORS } from '../../constants/chartTheme'
import type { DailyLog } from '../../types/dailyLog'

interface DeviationTrendChartProps {
  logs: DailyLog[]
}

function DotWithColor(props: { cx?: number; cy?: number; payload?: DailyLog }) {
  const { cx, cy, payload } = props
  if (!cx || !cy || !payload) return null
  const color =
    payload.flareRiskLevel === 'high'
      ? RISK_COLORS.high
      : payload.flareRiskLevel === 'medium'
        ? RISK_COLORS.medium
        : RISK_COLORS.low
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />
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
        <ReferenceLine y={6} stroke={RISK_COLORS.medium} strokeDasharray="4 4" opacity={0.6} label={{ value: 'Medium', position: 'right', fill: RISK_COLORS.medium, fontSize: 10 }} />
        <ReferenceLine y={10} stroke={RISK_COLORS.high} strokeDasharray="4 4" opacity={0.6} label={{ value: 'High', position: 'right', fill: RISK_COLORS.high, fontSize: 10 }} />
        <Area
          type="monotone"
          dataKey="deviationScore"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#devGradient)"
          dot={<DotWithColor />}
          activeDot={{ r: 6, strokeWidth: 2, stroke: '#6366f1', fill: 'white' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
