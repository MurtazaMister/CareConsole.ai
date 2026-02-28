import type { DailyLog } from '../types/dailyLog'

interface TrendChartProps {
  logs: DailyLog[]
}

export default function TrendChart({ logs }: TrendChartProps) {
  if (logs.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 log entries to show trends
      </div>
    )
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-14)

  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxDev = Math.max(...sorted.map((l) => l.deviationScore), 15)
  const xStep = chartW / (sorted.length - 1)

  const points = sorted.map((log, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartH - (log.deviationScore / maxDev) * chartH,
    log,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  // Risk zone lines
  const lowLine = padding.top + chartH - (5 / maxDev) * chartH
  const medLine = padding.top + chartH - (10 / maxDev) * chartH

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 5, 10, 15].filter((v) => v <= maxDev).map((v) => {
        const y = padding.top + chartH - (v / maxDev) * chartH
        return (
          <g key={v}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{v}</text>
          </g>
        )
      })}

      {/* Risk zones */}
      {5 <= maxDev && (
        <line x1={padding.left} y1={lowLine} x2={width - padding.right} y2={lowLine} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      )}
      {10 <= maxDev && (
        <line x1={padding.left} y1={medLine} x2={width - padding.right} y2={medLine} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      )}

      {/* Area fill */}
      <path d={areaPath} fill="url(#gradient)" opacity={0.2} />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={4}
            fill={
              p.log.flareRiskLevel === 'high' ? '#ef4444' :
              p.log.flareRiskLevel === 'medium' ? '#f59e0b' : '#10b981'
            }
            stroke="white"
            strokeWidth={2}
          />
          {/* Date labels */}
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
          >
            {new Date(p.log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        </g>
      ))}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  )
}
