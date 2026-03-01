import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDoctor } from '../hooks/useDoctor'
import ClientList from '../components/doctor/ClientList'
import PatientView from '../components/doctor/PatientView'
import type { BaselineProfile } from '../types/baseline'

type DoctorTab = 'overview' | 'history' | 'insights' | 'reports'

const TABS: { key: DoctorTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'history', label: 'Log History', icon: '📅' },
  { key: 'insights', label: 'Insights', icon: '🔬' },
  { key: 'reports', label: 'Reports', icon: '📄' },
]

export default function DoctorDashboard() {
  const { currentUser, logout } = useAuth()
  const { fetchClients, fetchPatientData, clearSelectedPatient, selectedPatient, patientLoading } = useDoctor()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [fetched, setFetched] = useState(false)
  const [activeTab, setActiveTab] = useState<DoctorTab>('overview')

  useEffect(() => {
    if (!fetched) {
      fetchClients().then(() => setFetched(true))
    }
  }, [fetched, fetchClients])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const initial = currentUser?.username?.charAt(0).toUpperCase() ?? '?'

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/auth')
  }

  const handleSelectPatient = async (patientId: string) => {
    setActiveTab('overview')
    await fetchPatientData(patientId)
  }

  const handleBack = () => {
    clearSelectedPatient()
  }

  if (!fetched) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const patientBaseline = selectedPatient?.baseline as BaselineProfile | null
  const baselineDateDisplay = patientBaseline?.baselineDate
    ? new Date(patientBaseline.baselineDate + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Back button when viewing patient */}
              {selectedPatient && (
                <button
                  onClick={handleBack}
                  className="p-1.5 -ml-1.5 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-text"
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                {selectedPatient ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white font-bold text-xs flex items-center justify-center">
                        {selectedPatient.patient.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-text leading-tight">{selectedPatient.patient.username}</h1>
                        <p className="text-text-muted text-xs">
                          {patientBaseline?.primaryCondition ?? 'No condition set'}
                          {baselineDateDisplay ? ` · Baseline: ${baselineDateDisplay}` : ''}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="text-xl font-brand text-text">
                      CareConsole.ai <span className="text-primary text-sm font-medium">Pro</span>
                    </h1>
                    <p className="text-text-muted text-xs">Doctor Dashboard</p>
                  </>
                )}
              </div>
            </div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-white font-bold text-sm flex items-center justify-center hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                {initial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-text">{currentUser?.username}</p>
                    <p className="text-xs text-text-muted truncate">{currentUser?.email}</p>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar — only when viewing a patient */}
          {selectedPatient && (
            <div className="flex gap-1 bg-surface-dark p-1 rounded-xl">
              {TABS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${activeTab === key
                      ? 'bg-white text-text shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-white/50'}
                  `}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {patientLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted text-sm">Loading patient data...</p>
            </div>
          </div>
        ) : selectedPatient ? (
          <PatientView activeTab={activeTab} onSwitchTab={(tab) => setActiveTab(tab as DoctorTab)} />
        ) : (
          <ClientList onSelectPatient={handleSelectPatient} />
        )}
      </div>
    </div>
  )
}
