import { useMemo, useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts'
import { CHART_AXIS_STYLE, CHART_GRID_STYLE } from '../../constants/chartTheme'
import type { DailyLog } from '../../types/dailyLog'
import type { MetricDefinition } from '../../types/schema'

interface SymptomCorrelationChartProps {
  logs: DailyLog[]
  metrics: MetricDefinition[]
}

function riskColor(log: DailyLog): string {
  const score = log.deviationScore ?? 0
  if (score <= 3) return '#10b981'  // green
  if (score <= 6) return '#f59e0b'  // amber
  return '#ef4444'                  // red
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CorrelationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-text mb-1">{d.dateLabel}</p>
      <p className="text-text-muted">{d.xLabel}: <span className="font-bold text-text">{d.x}</span></p>
      <p className="text-text-muted">{d.yLabel}: <span className="font-bold text-text">{d.y}</span></p>
      <p className="text-text-muted mt-1">Deviation: {d.deviation}</p>
    </div>
  )
}

export default function SymptomCorrelationChart({ logs, metrics }: SymptomCorrelationChartProps) {
  const [xMetric, setXMetric] = useState(metrics[0]?.key ?? '')
  const [yMetric, setYMetric] = useState(metrics[1]?.key ?? metrics[0]?.key ?? '')

  const xDef = metrics.find((m) => m.key === xMetric)
  const yDef = metrics.find((m) => m.key === yMetric)

  const data = useMemo(() => {
    return logs.map((log) => ({
      x: (log.responses?.[xMetric] ?? 0) as number,
      y: (log.responses?.[yMetric] ?? 0) as number,
      fill: riskColor(log),
      deviation: log.deviationScore ?? 0,
      dateLabel: new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      xLabel: xDef?.label ?? xMetric,
      yLabel: yDef?.label ?? yMetric,
    }))
  }, [logs, xMetric, yMetric, xDef, yDef])

  // Simple correlation coefficient
  const correlation = useMemo(() => {
    if (data.length < 3) return null
    const n = data.length
    const sumX = data.reduce((s, d) => s + d.x, 0)
    const sumY = data.reduce((s, d) => s + d.y, 0)
    const sumXY = data.reduce((s, d) => s + d.x * d.y, 0)
    const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0)
    const sumY2 = data.reduce((s, d) => s + d.y * d.y, 0)
    const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    if (denom === 0) return 0
    return Math.round(((n * sumXY - sumX * sumY) / denom) * 100) / 100
  }, [data])

  if (metrics.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 2 symptoms to show correlations
      </div>
    )
  }

  if (logs.length < 3) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Need at least 3 logs to show correlations
      </div>
    )
  }

  const corrColor = correlation !== null
    ? Math.abs(correlation) > 0.6 ? '#ef4444' : Math.abs(correlation) > 0.3 ? '#f59e0b' : '#10b981'
    : '#94a3b8'
  const corrLabel = correlation !== null
    ? Math.abs(correlation) > 0.6 ? 'Strong' : Math.abs(correlation) > 0.3 ? 'Moderate' : 'Weak'
    : ''

  return (
    <div>
      {/* Metric selectors */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">X-Axis</span>
          <select
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        <span className="text-text-muted text-xs">vs</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted font-medium uppercase tracking-wide">Y-Axis</span>
          <select
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        {correlation !== null && (
          <span className="ml-auto text-xs font-medium" style={{ color: corrColor }}>
            {corrLabel} correlation (r={correlation})
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid {...CHART_GRID_STYLE} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 10]}
            name={xDef?.label}
            tick={CHART_AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            label={{ value: xDef?.label ?? '', position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8' } }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 10]}
            name={yDef?.label}
            tick={CHART_AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            label={{ value: yDef?.label ?? '', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
          />
          <ZAxis range={[50, 50]} />
          <Tooltip content={<CorrelationTooltip />} />
          <Scatter
            data={data}
            isAnimationActive
            shape={(props: any) => (
              <circle cx={props.cx} cy={props.cy} r={6} fill={props.payload.fill} opacity={0.75} stroke="white" strokeWidth={1.5} />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-text-muted justify-center">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low risk
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> High risk
        </span>
      </div>
    </div>
  )
}
