import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE } from '../../constants/chartTheme'
import { FLARE_LEVEL_CONFIG, FLARE_SCORE_THRESHOLDS, FLARE_WINDOW_CHART_COLORS } from '../../constants/flareTheme'
import type { DayAnalysis, FlareWindow } from '../../lib/flareEngine'

interface CompositeScoreChartProps {
  dailyAnalysis: DayAnalysis[]
  flareWindows: FlareWindow[]
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const score = payload[0].value
  const level =
    score >= FLARE_SCORE_THRESHOLDS.severe ? 'severe'
    : score >= FLARE_SCORE_THRESHOLDS.mild ? 'mild'
    : score >= FLARE_SCORE_THRESHOLDS.watch ? 'watch'
    : 'none'
  const config = FLARE_LEVEL_CONFIG[level]

  return (
    <div className="bg-white rounded-xl border border-border shadow-lg px-4 py-3 text-sm">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="font-bold text-text">{score.toFixed(2)}</span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          {config.label}
        </span>
      </div>
    </div>
  )
}

export default function CompositeScoreChart({ dailyAnalysis, flareWindows }: CompositeScoreChartProps) {
  const data = useMemo(
    () =>
      dailyAnalysis.map((d) => ({
        date: formatDateLabel(d.date),
        score: Math.round(d.compositeScore * 100) / 100,
      })),
    [dailyAnalysis],
  )

  const dateSet = new Set(data.map((d) => d.date))
  const windowOverlays = useMemo(() => {
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

  if (dailyAnalysis.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 days of data
      </div>
    )
  }

  const maxScore = Math.max(...data.map((d) => d.score), FLARE_SCORE_THRESHOLDS.severe + 1)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="compositeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...CHART_GRID_STYLE} />
        <XAxis dataKey="date" tick={CHART_AXIS_STYLE} tickLine={false} axisLine={false} />
        <YAxis
          domain={[0, Math.ceil(maxScore)]}
          tick={CHART_AXIS_STYLE}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Threshold lines */}
        <ReferenceLine y={FLARE_SCORE_THRESHOLDS.watch} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1} label={{ value: 'Watch', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
        <ReferenceLine y={FLARE_SCORE_THRESHOLDS.mild} stroke="#f97316" strokeDasharray="6 4" strokeWidth={1} label={{ value: 'Mild', position: 'right', fill: '#f97316', fontSize: 10 }} />
        <ReferenceLine y={FLARE_SCORE_THRESHOLDS.severe} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1} label={{ value: 'Severe', position: 'right', fill: '#ef4444', fontSize: 10 }} />
        {/* Flare window overlays */}
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
          dataKey="score"
          name="Composite Score"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#compositeGradient)"
          dot={false}
          activeDot={{ r: 6, strokeWidth: 2, stroke: '#6366f1', fill: 'white' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
