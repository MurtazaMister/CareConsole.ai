interface MiniSliderProps {
  label: string
  icon?: string
  value: number
  onChange: (value: number) => void
  color: string
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  baselineValue?: number
  trackStyle?: 'progress' | 'intensity'
  showIcon?: boolean
}

export default function MiniSlider({
  label,
  icon,
  value,
  onChange,
  color,
  min = 0,
  max = 10,
  lowLabel,
  highLabel,
  baselineValue,
  trackStyle = 'progress',
  showIcon = true,
}: MiniSliderProps) {
  const range = max - min
  const percentage = range > 0 ? ((value - min) / range) * 100 : 0
  const deviation = baselineValue !== undefined ? value - baselineValue : undefined
  const ticks = Array.from({ length: range + 1 }, (_, i) => min + i)
  const intensityBase = 'linear-gradient(to right, #bbf7d0 0%, #fef3c7 50%, #fecaca 100%)'
  const intensityMask = `linear-gradient(to right, transparent 0%, transparent ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
  const trackBackground = trackStyle === 'intensity'
    ? `${intensityMask}, ${intensityBase}`
    : `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
  const intensityColor = (n: number) => {
    const t = range > 0 ? (n - min) / range : 0
    const start = { r: 187, g: 247, b: 208 } // #bbf7d0
    const mid = { r: 254, g: 243, b: 199 }   // #fef3c7
    const end = { r: 254, g: 202, b: 202 }   // #fecaca
    const r = t <= 0.5
      ? Math.round(start.r + (mid.r - start.r) * (t / 0.5))
      : Math.round(mid.r + (end.r - mid.r) * ((t - 0.5) / 0.5))
    const g = t <= 0.5
      ? Math.round(start.g + (mid.g - start.g) * (t / 0.5))
      : Math.round(mid.g + (end.g - mid.g) * ((t - 0.5) / 0.5))
    const b = t <= 0.5
      ? Math.round(start.b + (mid.b - start.b) * (t / 0.5))
      : Math.round(mid.b + (end.b - mid.b) * ((t - 0.5) / 0.5))
    return `rgb(${r}, ${g}, ${b})`
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {showIcon && icon ? <span className="text-xl">{icon}</span> : null}
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
          background: trackBackground,
        }}
      />

      {(lowLabel || highLabel) && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-text-muted">{lowLabel ?? `${min}`}</span>
          <span className="text-[10px] text-text-muted">{highLabel ?? `${max}`}</span>
        </div>
      )}

      <div className="grid grid-cols-11 gap-1 mt-3">
        {ticks.map((n) => {
          const isActive = n <= value
          const isCurrent = n === value
          const activeColor = trackStyle === 'intensity' ? intensityColor(n) : color
          const activeTextClass = trackStyle === 'intensity' ? 'text-slate-700' : 'text-white'
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`h-7 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                isActive ? activeTextClass : 'text-text-muted'
              } ${isCurrent ? 'ring-2 ring-offset-2 ring-primary/30' : ''}`}
              style={{
                backgroundColor: isActive ? activeColor : '#ffffff',
                borderColor: isActive ? activeColor : '#e2e8f0',
                boxShadow: isActive ? `0 6px 14px ${activeColor}25` : 'none',
                transform: isCurrent ? 'translateY(-1px) scale(1.02)' : 'translateY(0) scale(1)',
              }}
            >
              {n}
            </button>
          )
        })}
      </div>

      {baselineValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
          Baseline: {baselineValue}/{max}
        </div>
      )}
    </div>
  )
}
