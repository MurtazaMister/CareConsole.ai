import { createContext } from 'react'
import type { DailyLog } from '../types/dailyLog'

export interface LogsContextType {
  logs: DailyLog[]
  addLog: (log: DailyLog) => void
  updateLog: (date: string, log: DailyLog) => void
  getLogByDate: (date: string) => DailyLog | undefined
  getTodayLog: () => DailyLog | undefined
}

export const LogsContext = createContext<LogsContextType | null>(null)
