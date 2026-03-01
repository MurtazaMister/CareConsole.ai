import { SLEEP_QUALITY_LABELS } from '../types/baseline'

interface LikertScaleProps {
  value: number
  onChange: (value: number) => void
  baselineValue?: number
  showIcon?: boolean
  variant?: 'accent' | 'neutral'
}

export default function LikertScale({
  value,
  onChange,
  baselineValue,
  showIcon = true,
  variant = 'accent',
}: LikertScaleProps) {
  const isNeutral = variant === 'neutral'
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {showIcon ? <span className="text-xl">😴</span> : null}
          <span className="font-medium text-text text-sm">Sleep Quality</span>
        </div>
        <span className={`text-sm font-bold ${isNeutral ? 'text-slate-600' : 'text-indigo-500'}`}>
          {SLEEP_QUALITY_LABELS[value]}
        </span>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
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
            <span className="text-[9px] block mt-0.5 leading-tight">{SLEEP_QUALITY_LABELS[n]}</span>
          </button>
        ))}
      </div>

      {baselineValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
          Baseline: {SLEEP_QUALITY_LABELS[baselineValue]} ({baselineValue}/5)
        </div>
      )}
    </div>
  )
}
