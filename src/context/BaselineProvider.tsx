import { useState, useCallback, type ReactNode } from 'react'
import type { BaselineProfile } from '../types/baseline'
import { BaselineContext } from './baselineContext'

export function BaselineProvider({ children }: { children: ReactNode }) {
  const [baseline, setBaselineState] = useState<BaselineProfile | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBaseline = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/baseline', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setBaselineState(data.baseline)
      } else {
        setBaselineState(null)
      }
    } catch {
      setBaselineState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const setBaseline = useCallback(async (profile: BaselineProfile) => {
    const res = await fetch('/api/baseline', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profile),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to save baseline')
    }
    const data = await res.json()
    setBaselineState(data.baseline)
  }, [])

  const clearBaseline = useCallback(() => {
    setBaselineState(null)
  }, [])

  return (
    <BaselineContext.Provider value={{ baseline, loading, setBaseline, clearBaseline, fetchBaseline }}>
      {children}
    </BaselineContext.Provider>
  )
}
