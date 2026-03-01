interface TimeInputProps {
  label: string
  icon: string
  value: string // HH:MM
  onChange: (value: string) => void
  baselineValue?: string
  showIcon?: boolean
}

export default function TimeInput({ label, icon, value, onChange, baselineValue, showIcon = true }: TimeInputProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showIcon ? <span className="text-xl">{icon}</span> : null}
          <span className="font-medium text-text text-sm">{label}</span>
        </div>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>
      {baselineValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
          Baseline: {baselineValue}
        </div>
      )}
    </div>
  )
}
