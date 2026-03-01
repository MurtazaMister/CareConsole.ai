import { useState, useCallback, type ReactNode } from 'react'
import type { DailyLog } from '../types/dailyLog'
import { getTodayDateString } from '../types/dailyLog'
import { LogsContext } from './logsContext'

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/logs', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
      } else {
        setLogs([])
      }
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const addLog = useCallback(async (log: DailyLog) => {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(log),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to save log')
    }
    const data = await res.json()
    // Update local state with the server response (has computed deviation/flare)
    setLogs((prev) => {
      const existing = prev.findIndex((l) => l.date === data.log.date)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = data.log
        return updated
      }
      return [data.log, ...prev]
    })
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
    <LogsContext.Provider value={{ logs, loading, addLog, getLogByDate, getTodayLog, fetchLogs }}>
      {children}
    </LogsContext.Provider>
  )
}
