import { createContext } from 'react'
import type { DailyLog } from '../types/dailyLog'

export interface LogsContextType {
  logs: DailyLog[]
  loading: boolean
  addLog: (log: DailyLog) => Promise<void>
  getLogByDate: (date: string) => DailyLog | undefined
  getTodayLog: () => DailyLog | undefined
  fetchLogs: () => Promise<void>
}

export const LogsContext = createContext<LogsContextType | null>(null)
