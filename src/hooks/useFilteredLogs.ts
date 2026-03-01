import { useMemo } from 'react'
import { useLogs } from './useLogs'
import type { DailyLog } from '../types/dailyLog'
import type { DateRange } from '../constants/chartTheme'

export function useFilteredLogs(range: DateRange): DailyLog[] {
  const { logs } = useLogs()

  return useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))

    if (range.days === null) return sorted

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range.days)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    const filtered = sorted.filter((log) => log.date > cutoffStr)

    // max(all-time, range selected): if filter returns nothing, show all
    return filtered.length > 0 ? filtered : sorted
  }, [logs, range.days])
}
