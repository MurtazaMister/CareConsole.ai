import { useMemo } from 'react'
import { useBaseline } from './useBaseline'
import { useLogs } from './useLogs'
import { useSchema } from './useSchema'
import { runFlareEngine } from '../lib/flareEngine'
import type { FlareEngineResult } from '../lib/flareEngine'

export function useFlareEngine(): FlareEngineResult | null {
  const { baseline } = useBaseline()
  const { logs } = useLogs()
  const { activeMetrics } = useSchema()

  return useMemo(() => {
    if (!baseline || logs.length < 3) return null
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
    return runFlareEngine(sorted, baseline, activeMetrics)
  }, [baseline, logs, activeMetrics])
}
