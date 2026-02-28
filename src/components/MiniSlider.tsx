interface MiniSliderProps {
  label: string
  icon: string
  value: number
  onChange: (value: number) => void
  color: string
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  baselineValue?: number
}

export default function MiniSlider({ label, icon, value, onChange, color, min = 0, max = 10, lowLabel, highLabel, baselineValue }: MiniSliderProps) {
  const range = max - min
  const percentage = range > 0 ? ((value - min) / range) * 100 : 0
  const deviation = baselineValue !== undefined ? value - baselineValue : undefined

  return (
    <div className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-text text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {deviation !== undefined && deviation !== 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                color: deviation > 0 ? '#ef4444' : '#10b981',
                backgroundColor: deviation > 0 ? '#fef2f2' : '#f0fdf4',
              }}
            >
              {deviation > 0 ? '+' : ''}{deviation}
            </span>
          )}
          <span className="text-xl font-bold" style={{ color }}>
            {value}
            <span className="text-xs font-normal text-text-muted">/{max}</span>
          </span>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
        }}
      />

      {(lowLabel || highLabel) && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-text-muted">{lowLabel ?? `${min}`}</span>
          <span className="text-[10px] text-text-muted">{highLabel ?? `${max}`}</span>
        </div>
      )}

      {baselineValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
          Baseline: {baselineValue}/{max}
        </div>
      )}
    </div>
  )
}
