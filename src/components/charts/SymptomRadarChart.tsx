import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import type { BaselineProfile } from '../../types/baseline'
import type { DailyLog } from '../../types/dailyLog'
import type { MetricDefinition } from '../../types/schema'

interface SymptomRadarChartProps {
  baseline: BaselineProfile
  todayLog?: DailyLog
  metrics: MetricDefinition[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  const diff = row.Today - row.Baseline
  const diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : '#94a3b8'
  const diffLabel = diff > 0 ? `+${diff}` : diff === 0 ? '0' : `${diff}`

  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-text mb-1.5">{row.metric}</p>
      <div className="flex items-center gap-3">
        <span className="text-text-muted">
          Baseline: <span className="font-medium text-text">{row.Baseline}</span>
        </span>
        {row.Today !== undefined && row.Today !== 0 && (
          <span className="text-text-muted">
            Today: <span className="font-bold text-primary">{row.Today}</span>
          </span>
        )}
      </div>
      {row.Today !== undefined && row.Today !== 0 && (
        <p className="mt-1 font-bold" style={{ color: diffColor }}>
          {diffLabel} from baseline
        </p>
      )}
    </div>
  )
}

export default function SymptomRadarChart({ baseline, todayLog, metrics }: SymptomRadarChartProps) {
  const data = metrics.map((m) => {
    const baselineVal = baseline.responses?.[m.baselineKey ?? m.key]
      ?? (baseline as Record<string, unknown>)[m.baselineKey ?? m.key]
      ?? 0
    const todayVal = todayLog
      ? (todayLog.responses?.[m.key] ?? (todayLog as Record<string, unknown>)[m.key] ?? 0)
      : 0
    return {
      metric: m.label,
      Baseline: baselineVal as number,
      Today: todayVal as number,
    }
  })

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="48%" outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" gridType="polygon" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
          />
          <PolarRadiusAxis
            domain={[0, 10]}
            tickCount={3}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Baseline"
            dataKey="Baseline"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 4, fill: '#94a3b8', strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: '#94a3b8', strokeWidth: 2, fill: 'white' }}
            animationDuration={800}
            animationEasing="ease-out"
          />
          {todayLog && (
            <Radar
              name="Today"
              dataKey="Today"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: 'white' }}
              animationDuration={1000}
              animationBegin={300}
              animationEasing="ease-out"
            />
          )}
          <Tooltip content={<RadarTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
      {!todayLog && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-text-muted bg-white/80 px-3 py-1.5 rounded-full">
            No log today
          </span>
        </div>
      )}
    </div>
  )
}
