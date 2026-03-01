import { useState } from 'react'
import {
  PRESET_OPTIONS,
  CUSTOM_UNITS,
  type DateRange,
  type DateRangePreset,
  type CustomUnit,
} from '../../constants/chartTheme'

interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [customValue, setCustomValue] = useState(1)
  const [customUnit, setCustomUnit] = useState<CustomUnit>('W')

  const handlePreset = (key: DateRangePreset) => {
    if (key === 'custom') {
      const unit = CUSTOM_UNITS.find((u) => u.key === customUnit)!
      onChange({ preset: 'custom', days: customValue * unit.multiplier })
    } else {
      const preset = PRESET_OPTIONS.find((p) => p.key === key)!
      onChange({ preset: key, days: preset.days })
    }
  }

  const applyCustom = (val: number, unit: CustomUnit) => {
    const multiplier = CUSTOM_UNITS.find((u) => u.key === unit)!.multiplier
    const clamped = Math.max(1, val)
    onChange({ preset: 'custom', days: clamped * multiplier })
  }

  const handleCustomValueChange = (val: number) => {
    const clamped = Math.max(1, val)
    setCustomValue(clamped)
    if (value.preset === 'custom') {
      applyCustom(clamped, customUnit)
    }
  }

  const handleCustomUnitChange = (unit: CustomUnit) => {
    setCustomUnit(unit)
    if (value.preset === 'custom') {
      applyCustom(customValue, unit)
    }
  }

  const btnClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      active
        ? 'bg-primary text-white shadow-sm'
        : 'bg-surface text-text-muted hover:bg-surface-dark'
    }`

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_OPTIONS.map((preset) => (
        <button
          key={preset.key}
          onClick={() => handlePreset(preset.key)}
          className={btnClass(value.preset === preset.key)}
        >
          {preset.label}
        </button>
      ))}

      {/* Custom toggle */}
      <button
        onClick={() => handlePreset('custom')}
        className={btnClass(value.preset === 'custom')}
      >
        Custom
      </button>

      {/* Custom input — always visible when custom is active */}
      {value.preset === 'custom' && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="number"
            min={1}
            value={customValue}
            onChange={(e) => handleCustomValueChange(Number(e.target.value))}
            className="w-12 px-1.5 py-1 rounded-lg border border-border text-xs text-center font-medium text-text bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
          <div className="flex gap-0.5">
            {CUSTOM_UNITS.map((unit) => (
              <button
                key={unit.key}
                onClick={() => handleCustomUnitChange(unit.key)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  customUnit === unit.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-dark'
                }`}
              >
                {unit.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
