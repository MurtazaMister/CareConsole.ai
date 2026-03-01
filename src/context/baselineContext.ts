import { createContext } from 'react'
import type { BaselineProfile } from '../types/baseline'

export interface BaselineContextType {
  baseline: BaselineProfile | null
  loading: boolean
  setBaseline: (profile: BaselineProfile) => Promise<void>
  clearBaseline: () => void
  fetchBaseline: () => Promise<void>
}

export const BaselineContext = createContext<BaselineContextType | null>(null)
