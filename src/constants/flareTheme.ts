import type { FlareLevel } from '../lib/flareEngine'

export const FLARE_LEVEL_CONFIG: Record<
  FlareLevel,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
    gradient: string
  }
> = {
  none: {
    label: 'No Flare',
    color: '#10b981',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    gradient: 'from-emerald-50 to-green-50',
  },
  watch: {
    label: 'Watch',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    gradient: 'from-amber-50 to-yellow-50',
  },
  mild: {
    label: 'Mild Flare',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    gradient: 'from-orange-50 to-amber-50',
  },
  severe: {
    label: 'Severe Flare',
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    gradient: 'from-red-50 to-rose-50',
  },
}

export { COMPOSITE_THRESHOLDS as FLARE_SCORE_THRESHOLDS } from '../lib/flareEngine'

export const FLARE_WINDOW_CHART_COLORS = {
  mild: 'rgba(249, 115, 22, 0.08)',
  severe: 'rgba(239, 68, 68, 0.08)',
  mildStroke: 'rgba(249, 115, 22, 0.3)',
  severeStroke: 'rgba(239, 68, 68, 0.3)',
}
