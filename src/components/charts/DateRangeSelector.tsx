import { DATE_RANGE_PRESETS, type DateRangeKey } from '../../constants/chartTheme'

interface DateRangeSelectorProps {
  value: DateRangeKey
  onChange: (key: DateRangeKey) => void
}

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex gap-1.5">
      {DATE_RANGE_PRESETS.map((preset) => (
        <button
          key={preset.key}
          onClick={() => onChange(preset.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === preset.key
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-text-muted hover:bg-surface-dark'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
