import { SLEEP_QUALITY_LABELS } from '../types/baseline'

interface LikertScaleProps {
  value: number
  onChange: (value: number) => void
  baselineValue?: number
  showIcon?: boolean
  variant?: 'accent' | 'neutral'
  /** Custom label (defaults to "Sleep Quality") */
  label?: string
  /** Custom labels per value (defaults to SLEEP_QUALITY_LABELS) */
  labels?: Record<number, string>
  /** Number of points on the scale (defaults to 5) */
  scale?: number
}

export default function LikertScale({
  value,
  onChange,
  baselineValue,
  showIcon = true,
  variant = 'accent',
  label = 'Sleep Quality',
  labels: customLabels,
  scale = 5,
}: LikertScaleProps) {
  const isNeutral = variant === 'neutral'
  const labelMap = customLabels ?? SLEEP_QUALITY_LABELS
  const points = Array.from({ length: scale }, (_, i) => i + 1)

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {showIcon ? <span className="text-xl">😴</span> : null}
          <span className="font-medium text-text text-sm">{label}</span>
        </div>
        <span className={`text-sm font-bold ${isNeutral ? 'text-slate-600' : 'text-indigo-500'}`}>
          {labelMap[value]}
        </span>
      </div>

      <div className="flex gap-2">
        {points.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`
              flex-1 py-3 rounded-xl text-center transition-all duration-200 border-2 font-medium
              ${value === n
                ? isNeutral
                  ? 'border-slate-400 bg-slate-100 text-slate-700 shadow-sm scale-105'
                  : 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm scale-105'
                : 'border-border bg-white text-text-muted hover:border-gray-300 hover:bg-surface-dark'}
            `}
          >
            <span className="text-lg block">{n}</span>
            <span className="text-[9px] block mt-0.5 leading-tight">{labelMap[n]}</span>
          </button>
        ))}
      </div>

      {baselineValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
          Baseline: {labelMap[baselineValue]} ({baselineValue}/{scale})
        </div>
      )}
    </div>
  )
}
