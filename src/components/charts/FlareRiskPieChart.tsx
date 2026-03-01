import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { RISK_COLORS, CHART_TOOLTIP_STYLE } from '../../constants/chartTheme'
import { FLARE_RISK_CONFIG, type FlareRisk } from '../../types/dailyLog'
import type { DailyLog } from '../../types/dailyLog'

interface FlareRiskPieChartProps {
  logs: DailyLog[]
}

export default function FlareRiskPieChart({ logs }: FlareRiskPieChartProps) {
  const data = useMemo(() => {
    const counts: Record<FlareRisk, number> = { low: 0, medium: 0, high: 0 }
    logs.forEach((log) => {
      counts[log.flareRiskLevel]++
    })
    return (['low', 'medium', 'high'] as FlareRisk[])
      .filter((level) => counts[level] > 0)
      .map((level) => ({
        name: FLARE_RISK_CONFIG[level].label,
        value: counts[level],
        color: RISK_COLORS[level],
      }))
  }, [logs])

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No data yet
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value) => [`${value} days`, '']} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
            formatter={(value: string) => <span className="text-text-muted">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-text">{logs.length}</p>
        <p className="text-[10px] text-text-muted">days</p>
      </div>
    </div>
  )
}
