import { createContext } from 'react'
import type { BaselineProfile } from '../types/baseline'

export interface BaselineContextType {
  baseline: BaselineProfile | null
  setBaseline: (profile: BaselineProfile) => void
  clearBaseline: () => void
}

export const BaselineContext = createContext<BaselineContextType | null>(null)
