import { useState, useCallback, useContext } from 'react'
import { ViewingPatientContext } from '../context/viewingPatientContext'
import type { AIReport, AIReportRequest } from '../types/aiReport'

type ReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; report: AIReport }
  | { status: 'error'; error: string }

export function useAIReport() {
  const [state, setState] = useState<ReportState>({ status: 'idle' })
  const patientId = useContext(ViewingPatientContext)

  const generateReport = useCallback(async (payload: AIReportRequest) => {
    setState({ status: 'loading' })
    try {
      const body = patientId ? { ...payload, patientId } : payload
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
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
  }, [patientId])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, generateReport, reset }
}
