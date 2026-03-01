import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDoctor } from '../hooks/useDoctor'
import ClientList from '../components/doctor/ClientList'
import PatientView from '../components/doctor/PatientView'

export default function DoctorDashboard() {
  const { currentUser, logout } = useAuth()
  const { fetchClients, fetchPatientData, clearSelectedPatient, selectedPatient, patientLoading } = useDoctor()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [fetched, setFetched] = useState(false)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text">
                HackRare <span className="text-primary text-sm font-medium">Professional</span>
              </h1>
              <p className="text-text-muted text-xs">Doctor Dashboard</p>
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
          <PatientView onBack={handleBack} />
        ) : (
          <ClientList onSelectPatient={handleSelectPatient} />
        )}
      </div>
    </div>
  )
}
