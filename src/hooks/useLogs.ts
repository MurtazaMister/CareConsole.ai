import { useContext } from 'react'
import { LogsContext } from '../context/logsContext'

export function useLogs() {
  const context = useContext(LogsContext)
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider')
  }
  return context
}
