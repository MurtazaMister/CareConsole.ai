import { SYMPTOM_METRICS } from '../../types/baseline'

interface MetricToggleProps {
  active: Set<string>
  onChange: (active: Set<string>) => void
}

export default function MetricToggle({ active, onChange }: MetricToggleProps) {
  const toggle = (key: string) => {
    const next = new Set(active)
    if (next.has(key)) {
      if (next.size <= 1) return // prevent deselecting all
      next.delete(key)
    } else {
      next.add(key)
    }
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {SYMPTOM_METRICS.map((metric) => {
        const isActive = active.has(metric.key)
        return (
          <button
            key={metric.key}
            onClick={() => toggle(metric.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              isActive
                ? 'text-white shadow-sm'
                : 'bg-white text-text-muted border-border hover:border-border'
            }`}
            style={
              isActive
                ? { backgroundColor: metric.color, borderColor: metric.color }
                : undefined
            }
          >
            {metric.label}
          </button>
        )
      })}
    </div>
  )
}
