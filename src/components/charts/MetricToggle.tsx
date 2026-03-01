import type { MetricDefinition } from '../../types/schema'

interface MetricToggleProps {
  active: Set<string>
  onChange: (active: Set<string>) => void
  metrics: MetricDefinition[]
}

export default function MetricToggle({ active, onChange, metrics }: MetricToggleProps) {
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
      {metrics.map((metric) => {
        const isActive = active.has(metric.key)
        return (
          <button
            key={metric.key}
            onClick={() => toggle(metric.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer select-none ${
              isActive
                ? 'text-white shadow-sm hover:opacity-80'
                : 'bg-white text-text-muted border-border hover:border-gray-400 hover:text-text hover:shadow-sm'
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
