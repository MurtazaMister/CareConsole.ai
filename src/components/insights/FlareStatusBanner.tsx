import type { FlareLevel } from '../../lib/flareEngine'
import { FLARE_LEVEL_CONFIG } from '../../constants/flareTheme'

interface FlareStatusBannerProps {
  currentStatus: FlareLevel
  currentStreak: number
  trendDirection: 'improving' | 'stable' | 'worsening'
  latestScore: number
}

const TREND_DISPLAY: Record<string, { label: string; arrow: string; color: string }> = {
  improving: { label: 'Improving', arrow: '\u2193', color: 'text-emerald-600' },
  stable: { label: 'Stable', arrow: '\u2192', color: 'text-amber-600' },
  worsening: { label: 'Worsening', arrow: '\u2191', color: 'text-red-600' },
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const normalizedScore = Math.min(score / 10, 1)
  const strokeDashoffset = circumference * (1 - normalizedScore)

  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="4"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold text-text">
        {score.toFixed(1)}
      </span>
    </div>
  )
}

export default function FlareStatusBanner({
  currentStatus,
  currentStreak,
  trendDirection,
  latestScore,
}: FlareStatusBannerProps) {
  const config = FLARE_LEVEL_CONFIG[currentStatus]
  const trend = TREND_DISPLAY[trendDirection]

  return (
    <div
      className={`bg-gradient-to-r ${config.gradient} rounded-2xl border p-5 flex items-center justify-between gap-4`}
      style={{ borderColor: config.borderColor }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-muted mb-1">Current Status</p>
        <p className="text-xl font-bold" style={{ color: config.color }}>
          {config.label}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-text-muted">
            Day {currentStreak} at this level
          </span>
          <span className={`text-xs font-medium ${trend.color}`}>
            {trend.arrow} {trend.label}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 text-center">
        <ScoreRing score={latestScore} color={config.color} />
        <p className="text-[10px] text-text-muted mt-1">Composite Score</p>
      </div>
    </div>
  )
}
