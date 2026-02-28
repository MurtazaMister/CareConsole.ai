import { useState, useEffect, type ReactNode } from 'react'
import type { BaselineProfile } from '../types/baseline'
import { BaselineContext } from './baselineContext'

const STORAGE_KEY = 'hackrare-baseline'

export function BaselineProvider({ children }: { children: ReactNode }) {
  const [baseline, setBaselineState] = useState<BaselineProfile | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  })

  useEffect(() => {
    if (baseline) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(baseline))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [baseline])

  const setBaseline = (profile: BaselineProfile) => {
    setBaselineState(profile)
  }

  const clearBaseline = () => {
    setBaselineState(null)
  }

  return (
    <BaselineContext.Provider value={{ baseline, setBaseline, clearBaseline }}>
      {children}
    </BaselineContext.Provider>
  )
}
