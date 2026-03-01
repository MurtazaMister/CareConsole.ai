import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'
import { SYMPTOM_METRICS } from '../../types/baseline'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import { FLARE_WINDOW_CHART_COLORS } from '../../constants/flareTheme'
import type { DailyLog } from '../../types/dailyLog'
import type { FlareWindow } from '../../lib/flareEngine'

interface SymptomTrendChartProps {
  logs: DailyLog[]
  activeMetrics: Set<string>
  flareWindows?: FlareWindow[]
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function SymptomTrendChart({ logs, activeMetrics, flareWindows }: SymptomTrendChartProps) {
  const data = useMemo(
    () =>
      logs.map((log) => ({
        date: formatDateLabel(log.date),
        ...Object.fromEntries(
          SYMPTOM_METRICS.map((m) => [m.key, log[m.key]]),
        ),
      })),
    [logs],
  )

  // Map flare window dates to chart date labels
  const dateSet = new Set(data.map((d) => d.date))
  const windowOverlays = useMemo(() => {
    if (!flareWindows || flareWindows.length === 0) return []
    return flareWindows.map((fw) => {
      const x1 = formatDateLabel(fw.startDate)
      const x2 = fw.endDate
        ? formatDateLabel(fw.endDate)
        : data[data.length - 1]?.date
      return {
        id: fw.id,
        x1: dateSet.has(x1) ? x1 : data[0]?.date,
        x2: dateSet.has(x2!) ? x2! : data[data.length - 1]?.date,
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

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid {...CHART_GRID_STYLE} />
        <XAxis dataKey="date" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
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
        {SYMPTOM_METRICS.filter((m) => activeMetrics.has(m.key)).map((metric) => (
          <Line
            key={metric.key}
            type="monotone"
            dataKey={metric.key}
            name={metric.label}
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
