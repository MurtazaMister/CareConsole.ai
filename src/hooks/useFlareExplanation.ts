import { useRef, useState, useCallback } from 'react'
import type { FlareExplanationRequest, FlareExplanationState } from '../types/flareExplanation'

export function useFlareExplanation() {
  const cache = useRef<Map<string, FlareExplanationState>>(new Map())
  const [, setTick] = useState(0)

  const rerender = useCallback(() => setTick((t) => t + 1), [])

  const getState = useCallback(
    (windowId: string): FlareExplanationState =>
      cache.current.get(windowId) ?? { status: 'idle' },
    [],
  )

  const fetchExplanation = useCallback(
    async (windowId: string, payload: FlareExplanationRequest) => {
      const current = cache.current.get(windowId)
      if (current?.status === 'loading' || current?.status === 'success') return
      // Clear error state so retry works
      if (current?.status === 'error') cache.current.delete(windowId)

      cache.current.set(windowId, { status: 'loading' })
      rerender()

      try {
        const res = await fetch('/api/ai/explain-flare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const text = await res.text()
          let message = 'Failed to generate explanation'
          try {
            const data = JSON.parse(text)
            message = data.error || message
          } catch {
            // non-JSON response (e.g. HTML 404)
          }
          throw new Error(message)
        }

        const data = await res.json()
        cache.current.set(windowId, {
          status: 'success',
          data: { explanation: data.explanation, generatedAt: data.generatedAt },
        })
      } catch (err) {
        cache.current.set(windowId, {
          status: 'error',
          error: (err as Error).message,
        })
      }

      rerender()
    },
    [rerender],
  )

  return { getState, fetchExplanation }
}
