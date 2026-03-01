import { createContext } from 'react'
import type { LogFormSchema } from '../constants/logFormSchema'
import type { MetricDefinition } from '../types/schema'

export interface SchemaContextType {
  schema: LogFormSchema | null
  loading: boolean
  fetchSchema: () => Promise<void>
  generateSchema: () => Promise<void>
  activeMetrics: MetricDefinition[]
}

export const SchemaContext = createContext<SchemaContextType | null>(null)
