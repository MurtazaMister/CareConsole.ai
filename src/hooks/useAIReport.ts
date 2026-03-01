import { useState, useCallback } from 'react'
import type { AIReport, AIReportRequest } from '../types/aiReport'

type ReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; report: AIReport }
  | { status: 'error'; error: string }

export function useAIReport() {
  const [state, setState] = useState<ReportState>({ status: 'idle' })

  const generateReport = useCallback(async (payload: AIReportRequest) => {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate report')
      }
      const data = await res.json()
      setState({ status: 'success', report: data.report })
    } catch (err) {
      setState({ status: 'error', error: (err as Error).message })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, generateReport, reset }
}
