import { SYMPTOM_METRICS } from '../types/baseline'

// ── Date Range Presets ───────────────────────────────────

export type DateRangeKey = '7d' | '14d' | '30d' | 'all'

export const DATE_RANGE_PRESETS: { key: DateRangeKey; label: string; days: number | null }[] = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '14d', label: '14 Days', days: 14 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: 'all', label: 'All', days: null },
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
