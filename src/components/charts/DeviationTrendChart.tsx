import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import { FLARE_WINDOW_CHART_COLORS } from '../../constants/flareTheme'
import type { DailyLog } from '../../types/dailyLog'
import type { FlareWindow } from '../../lib/flareEngine'

interface DeviationTrendChartProps {
  logs: DailyLog[]
  flareWindows?: FlareWindow[]
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function DeviationTrendChart({ logs, flareWindows }: DeviationTrendChartProps) {
  const data = useMemo(
    () =>
      logs.map((log) => ({
        ...log,
        dateLabel: formatDateLabel(log.date),
      })),
    [logs],
  )

  const dateSet = new Set(data.map((d) => d.dateLabel))
  const windowOverlays = useMemo(() => {
    if (!flareWindows || flareWindows.length === 0) return []
    return flareWindows.map((fw) => {
      const x1 = formatDateLabel(fw.startDate)
      const x2 = fw.endDate
        ? formatDateLabel(fw.endDate)
        : data[data.length - 1]?.dateLabel
      return {
        id: fw.id,
        x1: dateSet.has(x1) ? x1 : data[0]?.dateLabel,
        x2: dateSet.has(x2!) ? x2! : data[data.length - 1]?.dateLabel,
        isSevere: fw.peakLevel === 'severe',
      }
    }).filter((o) => o.x1 && o.x2)
  }, [flareWindows, data, dateSet])

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
        {windowOverlays.map((o) => (
          <ReferenceArea
            key={o.id}
            x1={o.x1}
            x2={o.x2}
            fill={o.isSevere ? FLARE_WINDOW_CHART_COLORS.severe : FLARE_WINDOW_CHART_COLORS.mild}
            stroke={o.isSevere ? FLARE_WINDOW_CHART_COLORS.severeStroke : FLARE_WINDOW_CHART_COLORS.mildStroke}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
          />
        ))}
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
