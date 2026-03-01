import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import { SLEEP_QUALITY_LABELS } from '../../types/baseline'
import type { DailyLog } from '../../types/dailyLog'

interface SleepChartProps {
  logs: DailyLog[]
}

export default function SleepChart({ logs }: SleepChartProps) {
  const data = useMemo(
    () =>
      logs.map((log) => {
        const hours = (log.responses?.sleepHours ?? log.sleepHours) as number
        const quality = (log.responses?.sleepQuality ?? log.sleepQuality) as number
        return {
          date: new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          hours,
          quality,
          qualityLabel: SLEEP_QUALITY_LABELS[quality],
        }
      }),
    [logs],
  )

  if (logs.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 logs to show sleep trends
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm bg-indigo-400 inline-block" /> Hours
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Quality (1-5)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid {...CHART_GRID_STYLE} />
          <XAxis dataKey="date" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="hours"
            domain={[0, 12]}
            tick={CHART_AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
          />
          <YAxis
            yAxisId="quality"
            orientation="right"
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={CHART_AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Quality', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#94a3b8' } }}
          />
          <Tooltip
            {...CHART_TOOLTIP_STYLE}
            formatter={(value, name) => {
              if (name === 'Quality') return [SLEEP_QUALITY_LABELS[value as number] || value, name]
              return [`${value}h`, name]
            }}
          />
          <Bar yAxisId="hours" dataKey="hours" name="Hours" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.45} />
          <Line yAxisId="quality" type="monotone" dataKey="quality" name="Quality" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#10b981', fill: 'white' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
