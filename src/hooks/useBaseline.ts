import { useContext } from 'react'
import { BaselineContext } from '../context/baselineContext'

export function useBaseline() {
  const context = useContext(BaselineContext)
  if (!context) {
    throw new Error('useBaseline must be used within a BaselineProvider')
  }
  return context
}
