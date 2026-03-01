import { SYMPTOM_METRICS } from '../types/baseline'

// ── Date Range ───────────────────────────────────────────

export type DateRangePreset = '1w' | '1m' | '1y' | 'custom'

export interface DateRange {
  preset: DateRangePreset
  /** Total days to show. null = all-time */
  days: number | null
}

export const PRESET_OPTIONS: { key: DateRangePreset; label: string; days: number | null }[] = [
  { key: '1w', label: '1W', days: 7 },
  { key: '1m', label: '1M', days: 30 },
  { key: '1y', label: '1Y', days: 365 },
]

export type CustomUnit = 'D' | 'W' | 'M' | 'Y'

export const CUSTOM_UNITS: { key: CustomUnit; label: string; multiplier: number }[] = [
  { key: 'D', label: 'D', multiplier: 1 },
  { key: 'W', label: 'W', multiplier: 7 },
  { key: 'M', label: 'M', multiplier: 30 },
  { key: 'Y', label: 'Y', multiplier: 365 },
]

// ── Metric Colors (from SYMPTOM_METRICS) ─────────────────

export const METRIC_COLORS: Record<string, string> = Object.fromEntries(
  SYMPTOM_METRICS.map((m) => [m.key, m.color]),
)

// ── Shared Chart Styling ─────────────────────────────────

export const CHART_AXIS_STYLE = {
  fontSize: 11,
  fill: '#94a3b8',
  fontFamily: 'inherit',
}

export const CHART_GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#e2e8f0',
}

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    fontSize: '12px',
    padding: '8px 12px',
  },
  labelStyle: {
    fontWeight: 600,
    marginBottom: '4px',
    color: '#334155',
  },
}
