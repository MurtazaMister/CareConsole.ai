import { useContext } from 'react'
import { SchemaContext } from '../context/schemaContext'

export function useSchema() {
  const context = useContext(SchemaContext)
  if (!context) {
    throw new Error('useSchema must be used within a SchemaProvider')
  }
  return context
}
