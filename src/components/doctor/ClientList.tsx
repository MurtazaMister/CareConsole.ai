import { useState } from 'react'
import { useDoctor } from '../../hooks/useDoctor'
import type { ClientSummary } from '../../context/DoctorProvider'

interface ClientListProps {
  onSelectPatient: (patientId: string) => void
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function ClientList({ onSelectPatient }: ClientListProps) {
  const { clients, clientsLoading, addClient, removeClient } = useDoctor()
  const [search, setSearch] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const handleAddClient = async () => {
    if (!search.trim()) return
    setAdding(true)
    setAddError('')
    const result = await addClient(search.trim())
    if (!result.success) {
      setAddError(result.error ?? 'Failed to add client')
    } else {
      setSearch('')
    }
    setAdding(false)
  }

  const handleRemove = async (patientId: string) => {
    await removeClient(patientId)
    setConfirmRemove(null)
  }

  const riskColor = (risk: string | null) => {
    if (risk === 'high') return 'bg-red-100 text-red-700 border-red-200'
    if (risk === 'moderate') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (risk === 'low') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    return 'bg-gray-100 text-gray-500 border-gray-200'
  }

  const trendIcon = (trend: ClientSummary['recentTrend']) => {
    if (trend === 'improving') return { arrow: '\u2193', color: 'text-emerald-600', label: 'Improving' }
    if (trend === 'worsening') return { arrow: '\u2191', color: 'text-red-600', label: 'Worsening' }
    return { arrow: '\u2192', color: 'text-gray-400', label: 'Stable' }
  }

  const lastLogColor = (days: number | null) => {
    if (days === null) return 'text-gray-400'
    if (days >= 7) return 'text-red-600'
    if (days >= 3) return 'text-amber-600'
    return 'text-emerald-600'
  }

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add client search */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text mb-3">Add Patient by Username</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setAddError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
            placeholder="Enter patient username..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
          />
          <button
            onClick={handleAddClient}
            disabled={adding || !search.trim()}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
              adding || !search.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/20'
            }`}
          >
            {adding ? 'Adding...' : 'Add Client'}
          </button>
        </div>
        {addError && (
          <p className="text-red-500 text-xs mt-2">{addError}</p>
        )}
      </div>

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-text mb-2">No Clients Yet</h3>
          <p className="text-text-muted text-sm">Add patients by entering their username above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client: ClientSummary) => {
            const days = daysSince(client.lastLogDate)
            const trend = trendIcon(client.recentTrend)

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
                onClick={() => onSelectPatient(client.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {client.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-text">{client.username}</h4>
                        {client.lastFlareRisk && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${riskColor(client.lastFlareRisk)}`}>
                            {client.lastFlareRisk.toUpperCase()}
                          </span>
                        )}
                        {client.totalLogs > 0 && (
                          <span className={`text-sm font-bold ${trend.color}`} title={trend.label}>
                            {trend.arrow}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate">
                        {client.condition ?? 'No condition set'}
                        {client.conditionDurationMonths ? ` \u00b7 ${Math.floor(client.conditionDurationMonths / 12)}y ${client.conditionDurationMonths % 12}m` : ''}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 text-xs text-text-muted">
                      <div className="text-center">
                        <p className="font-medium text-text">
                          {client.lastDeviationScore !== null ? `${Math.round(client.lastDeviationScore)}%` : '--'}
                        </p>
                        <p>Deviation</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-text">{client.totalLogs}</p>
                        <p>Logs</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-medium ${lastLogColor(days)}`}>
                          {days !== null ? `${days}d ago` : '--'}
                        </p>
                        <p>Last Log</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemove(client.id) }}
                      className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove client"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-text-muted group-hover:text-primary transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Remove confirmation */}
                {confirmRemove === client.id && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-text-muted">Remove {client.username} from your clients?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRemove(client.id)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
