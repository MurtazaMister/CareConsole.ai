import { useState, useCallback, type ReactNode } from 'react'
import { createContext } from 'react'

export interface ClientSummary {
  id: string
  username: string
  email: string
  profile: { age?: number } | null
  condition: string | null
  conditionDurationMonths: number | null
  lastLogDate: string | null
  lastDeviationScore: number | null
  lastFlareRisk: string | null
  totalLogs: number
  recentTrend: 'improving' | 'stable' | 'worsening'
  addedAt: string
}

export interface PatientData {
  patient: {
    id: string
    username: string
    email: string
    profile: Record<string, unknown> | null
  }
  baseline: Record<string, unknown> | null
  logs: Record<string, unknown>[]
  schema: Record<string, unknown> | null
  metrics: {
    finalMetrics: string[]
    transientMetrics: string[]
    tombstoneMetrics: string[]
  }
}

export interface DoctorContextType {
  clients: ClientSummary[]
  clientsLoading: boolean
  fetchClients: () => Promise<void>
  addClient: (username: string) => Promise<{ success: boolean; error?: string }>
  removeClient: (patientId: string) => Promise<{ success: boolean; error?: string }>
  selectedPatient: PatientData | null
  patientLoading: boolean
  fetchPatientData: (patientId: string) => Promise<void>
  clearSelectedPatient: () => void
}

export const DoctorContext = createContext<DoctorContextType | null>(null)

export function DoctorProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)

  const fetchClients = useCallback(async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/doctor/clients', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients)
      }
    } catch {
      // Network error
    } finally {
      setClientsLoading(false)
    }
  }, [])

  const addClient = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/doctor/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to add client' }
      }
      setClients((prev) => [...prev, data.client])
      return { success: true }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [])

  const removeClient = useCallback(async (patientId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/doctor/clients/${patientId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        return { success: false, error: data.error || 'Failed to remove client' }
      }
      setClients((prev) => prev.filter((c) => c.id !== patientId))
      return { success: true }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [])

  const fetchPatientData = useCallback(async (patientId: string) => {
    setPatientLoading(true)
    try {
      const res = await fetch(`/api/doctor/clients/${patientId}/data`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSelectedPatient(data)
      }
    } catch {
      // Network error
    } finally {
      setPatientLoading(false)
    }
  }, [])

  const clearSelectedPatient = useCallback(() => {
    setSelectedPatient(null)
  }, [])

  return (
    <DoctorContext.Provider
      value={{
        clients,
        clientsLoading,
        fetchClients,
        addClient,
        removeClient,
        selectedPatient,
        patientLoading,
        fetchPatientData,
        clearSelectedPatient,
      }}
    >
      {children}
    </DoctorContext.Provider>
  )
}
