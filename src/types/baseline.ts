export interface BaselineProfile {
  energyLevel: number
  painLevel: number
  moodLevel: number
  sleepQuality: number
  mobility: number
  notes: string
  createdAt: string
}

export interface MetricConfig {
  key: keyof Omit<BaselineProfile, 'notes' | 'createdAt'>
  label: string
  icon: string
  lowLabel: string
  highLabel: string
  color: string
  gradient: string
}

export const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'energyLevel',
    label: 'Energy Level',
    icon: '⚡',
    lowLabel: 'Cannot get out of bed',
    highLabel: 'Fully active and energetic',
    color: '#f59e0b',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    key: 'painLevel',
    label: 'Pain Level',
    icon: '💊',
    lowLabel: 'No pain at all',
    highLabel: 'Severe, unbearable pain',
    color: '#ef4444',
    gradient: 'from-red-400 to-rose-500',
  },
  {
    key: 'moodLevel',
    label: 'Mood',
    icon: '🧠',
    lowLabel: 'Very low, struggling',
    highLabel: 'Excellent, thriving',
    color: '#8b5cf6',
    gradient: 'from-violet-400 to-purple-500',
  },
  {
    key: 'sleepQuality',
    label: 'Sleep Quality',
    icon: '🌙',
    lowLabel: 'Terrible, no rest',
    highLabel: 'Deep, restorative sleep',
    color: '#6366f1',
    gradient: 'from-indigo-400 to-blue-500',
  },
  {
    key: 'mobility',
    label: 'Mobility',
    icon: '🏃',
    lowLabel: 'Cannot move freely',
    highLabel: 'Full range of motion',
    color: '#10b981',
    gradient: 'from-emerald-400 to-teal-500',
  },
]

export function getInterpretation(key: MetricConfig['key'], value: number): string {
  const interpretations: Record<MetricConfig['key'], Record<string, string>> = {
    energyLevel: {
      low: 'Very low energy is part of your baseline.',
      mid: 'Moderate energy levels are your normal.',
      high: 'High energy is your usual state.',
    },
    painLevel: {
      low: 'Minimal pain is your usual experience.',
      mid: 'Moderate persistent pain is part of your baseline.',
      high: 'Significant pain is part of your daily experience.',
    },
    moodLevel: {
      low: 'Lower mood is part of your usual state.',
      mid: 'Balanced mood is your typical experience.',
      high: 'Positive mood is your usual baseline.',
    },
    sleepQuality: {
      low: 'Poor sleep quality is part of your baseline.',
      mid: 'Moderate sleep quality is your normal.',
      high: 'Good sleep is your usual experience.',
    },
    mobility: {
      low: 'Limited mobility is part of your baseline.',
      mid: 'Moderate mobility is your usual range.',
      high: 'Good mobility is your typical state.',
    },
  }

  const level = value <= 3 ? 'low' : value <= 7 ? 'mid' : 'high'
  return interpretations[key][level]
}
