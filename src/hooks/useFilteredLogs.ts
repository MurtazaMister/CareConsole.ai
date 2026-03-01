import { useMemo } from 'react'
import { useLogs } from './useLogs'
import type { DailyLog } from '../types/dailyLog'
import type { DateRangeKey } from '../constants/chartTheme'

export function useFilteredLogs(range: DateRangeKey): DailyLog[] {
  const { logs } = useLogs()

  return useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))

    if (range === 'all') return sorted

    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    return sorted.filter((log) => log.date > cutoffStr)
  }, [logs, range])
}
