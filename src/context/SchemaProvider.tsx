import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { SchemaContext } from './schemaContext'
import { LOG_FORM_SCHEMA, getSliderQuestions, type LogFormSchema } from '../constants/logFormSchema'
import type { MetricDefinition } from '../types/schema'

/** Derive MetricDefinition[] from a LogFormSchema */
function deriveMetrics(schema: LogFormSchema): MetricDefinition[] {
  const sliders = getSliderQuestions(schema)
  return sliders.map((q) => ({
    key: q.id,
    label: q.label,
    color: q.color,
    weight: (q as { weight?: number }).weight ?? 1 / sliders.length,
    baselineKey: q.baselineKey,
  }))
}

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [schema, setSchema] = useState<LogFormSchema | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSchema = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/schema', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.schema) {
          setSchema(data.schema)
        }
      }
    } catch {
      // Schema not available — will fall back to static
    } finally {
      setLoading(false)
    }
  }, [])

  const generateSchema = useCallback(async () => {
    try {
      const res = await fetch('/api/schema/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.schema) {
          setSchema(data.schema)
        }
      }
    } catch {
      // Generation failed — keep current schema or fallback
    }
  }, [])

  const activeMetrics = useMemo(() => {
    if (schema) return deriveMetrics(schema)
    return deriveMetrics(LOG_FORM_SCHEMA)
  }, [schema])

  // The effective schema exposed to consumers: dynamic or static fallback
  const effectiveSchema = schema ?? LOG_FORM_SCHEMA

  return (
    <SchemaContext.Provider value={{ schema: effectiveSchema, loading, fetchSchema, generateSchema, activeMetrics }}>
      {children}
    </SchemaContext.Provider>
  )
}
