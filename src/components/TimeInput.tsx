import { useRef } from 'react'

interface TimeInputProps {
  label: string
  icon: string
  value: string // HH:MM
  onChange: (value: string) => void
  baselineValue?: string
  showIcon?: boolean
  showDropdownArrow?: boolean
}

export default function TimeInput({
  label,
  icon,
  value,
  onChange,
  baselineValue,
  showIcon = false,
  showDropdownArrow = false,
}: TimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const openPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker()
      }
      inputRef.current.focus()
    }
  }
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showIcon ? (
            <span className="text-xl inline-flex items-center gap-1">
              <span>{icon}</span>
              <span className="text-sm text-text-muted">▾</span>
            </span>
          ) : null}
          <span className="font-medium text-text text-sm">{label}</span>
        </div>
        <div className="relative">
          <input
            type="time"
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-2 pr-7 rounded-lg border border-border bg-surface text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
          />
          {showDropdownArrow && (
            <button
              type="button"
              onClick={openPicker}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-text-muted hover:text-text cursor-pointer"
            >
              <span className="text-[10px]">▾</span>
            </button>
          )}
        </div>
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
