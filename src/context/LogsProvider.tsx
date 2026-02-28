import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { DailyLog } from '../types/dailyLog'
import { getTodayDateString } from '../types/dailyLog'
import { LogsContext } from './logsContext'

const STORAGE_KEY = 'hackrare-logs'

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<DailyLog[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  }, [logs])

  const addLog = useCallback((log: DailyLog) => {
    setLogs((prev) => {
      const existing = prev.findIndex((l) => l.date === log.date)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = log
        return updated
      }
      return [...prev, log]
    })
  }, [])

  const updateLog = useCallback((date: string, log: DailyLog) => {
    setLogs((prev) => prev.map((l) => (l.date === date ? log : l)))
  }, [])

  const getLogByDate = useCallback(
    (date: string) => logs.find((l) => l.date === date),
    [logs],
  )

  const getTodayLog = useCallback(
    () => logs.find((l) => l.date === getTodayDateString()),
    [logs],
  )

  return (
    <LogsContext.Provider value={{ logs, addLog, updateLog, getLogByDate, getTodayLog }}>
      {children}
    </LogsContext.Provider>
  )
}
