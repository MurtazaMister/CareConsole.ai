import { useState, useRef, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { useAuth } from '../hooks/useAuth'
import TabBar from '../components/TabBar'
import type { Tab } from '../components/TabBar'
import OverviewTab from '../components/OverviewTab'
import LogTab from '../components/LogTab'
import HistoryTab from '../components/HistoryTab'

export default function Dashboard() {
  const { baseline, loading: baselineLoading, fetchBaseline } = useBaseline()
  const { getTodayLog, loading: logsLoading, fetchLogs } = useLogs()
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [fetched, setFetched] = useState(false)

  // Fetch baseline and logs on mount
  useEffect(() => {
    if (!fetched) {
      Promise.all([fetchBaseline(), fetchLogs()]).then(() => setFetched(true))
    }
  }, [fetched, fetchBaseline, fetchLogs])

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (!fetched || baselineLoading || logsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!baseline) {
    return <Navigate to="/onboarding" replace />
  }

  const todayLog = getTodayLog()
  const baselineDateDisplay = baseline.baselineDate
    ? new Date(baseline.baselineDate + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date(baseline.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  const initial = currentUser?.username?.charAt(0).toUpperCase() ?? '?'

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-text">HackRare</h1>
              <p className="text-text-muted text-xs">Baseline: {baselineDateDisplay}</p>
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
                  <div className="py-1">
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/profile-setup') }}
                      className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); navigate('/onboarding') }}
                      className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors"
                    >
                      Edit Baseline
                    </button>
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
          <TabBar active={activeTab} onChange={setActiveTab} hasLoggedToday={!!todayLog} />
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab onSwitchTab={setActiveTab} />}
        {activeTab === 'log' && <LogTab onSwitchTab={setActiveTab} />}
        {activeTab === 'history' && <HistoryTab onSwitchTab={setActiveTab} />}
      </div>
    </div>
  )
}
