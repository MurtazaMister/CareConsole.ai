import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { SYMPTOM_METRICS } from '../../types/baseline'
import type { BaselineProfile } from '../../types/baseline'
import type { DailyLog } from '../../types/dailyLog'

interface SymptomRadarChartProps {
  baseline: BaselineProfile
  todayLog?: DailyLog
}

export default function SymptomRadarChart({ baseline, todayLog }: SymptomRadarChartProps) {
  const data = SYMPTOM_METRICS.map((m) => ({
    metric: m.label,
    Baseline: baseline[m.key],
    Today: todayLog?.[m.key] ?? 0,
  }))

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} />
          <Radar
            name="Baseline"
            dataKey="Baseline"
            stroke="#94a3b8"
            fill="#94a3b8"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          {todayLog && (
            <Radar
              name="Today"
              dataKey="Today"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
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
