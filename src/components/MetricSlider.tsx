import { useState } from 'react'
import type { MetricConfig } from '../types/baseline'

interface MetricSliderProps {
  config: MetricConfig
  value: number
  onChange: (value: number) => void
  isActive: boolean
}

export default function MetricSlider({ config, value, onChange, isActive }: MetricSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const percentage = ((value - 1) / 9) * 100

  return (
    <div
      className={`
        transition-all duration-500 ease-out
        ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none absolute'}
      `}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-border p-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block" role="img" aria-label={config.label}>
            {config.icon}
          </span>
          <h2 className="text-2xl font-bold text-text">{config.label}</h2>
          <p className="text-text-muted mt-1 text-sm">
            How would you describe your <span className="lowercase">usual</span> level?
          </p>
        </div>

        {/* Value Display */}
        <div className="text-center mb-6">
          <div
            className={`
              inline-flex items-center justify-center w-20 h-20 rounded-full
              text-3xl font-bold text-white
              bg-gradient-to-br ${config.gradient}
              transition-transform duration-200
              ${isDragging ? 'scale-110' : 'scale-100'}
            `}
            style={{ boxShadow: `0 8px 24px ${config.color}40` }}
          >
            {value}
          </div>
        </div>

        {/* Slider */}
        <div className="px-2 mb-4">
          <input
            type="range"
            min={1}
            max={10}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="w-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${config.color} 0%, ${config.color} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
            }}
          />
          <div className="flex justify-between mt-2">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                onClick={() => onChange(i + 1)}
                className={`
                  w-6 h-6 rounded-full text-xs font-medium transition-all duration-200
                  ${value === i + 1
                    ? 'text-white scale-110'
                    : 'text-text-muted hover:bg-surface-dark'
                  }
                `}
                style={value === i + 1 ? { backgroundColor: config.color } : {}}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Scale Labels */}
        <div className="flex justify-between text-xs text-text-muted mt-4 px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-surface-dark" />
            {config.lowLabel}
          </span>
          <span className="flex items-center gap-1">
            {config.highLabel}
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
          </span>
        </div>
      </div>
    </div>
  )
}
