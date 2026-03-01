import { useState } from 'react'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { SYMPTOM_METRICS, SLEEP_QUALITY_LABELS } from '../types/baseline'
import { HEALTH_CHECKS } from '../types/dailyLog'
import type { DailyLog } from '../types/dailyLog'
import type { Tab } from './TabBar'
import DeviationTrendChart from './charts/DeviationTrendChart'

interface HistoryTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function HistoryTab({ onSwitchTab }: HistoryTabProps) {
  const { baseline } = useBaseline()
  const { logs } = useLogs()
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  if (!baseline) return null

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  const toggleExpand = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date))
  }

  const renderLogDetail = (log: DailyLog) => {
    const checkedItems = log.redFlags ? Object.values(log.redFlags).filter(Boolean).length : 0

    return (
      <tr>
        <td colSpan={7} className="px-4 py-4 bg-surface/50">
          <div className="space-y-4">
            {/* Symptom detail grid */}
            <div className="grid grid-cols-4 gap-2">
              {SYMPTOM_METRICS.map((metric) => {
                const base = baseline[metric.key]
                const today = log[metric.key]
                const diff = today - base
                return (
                  <div key={metric.key} className="text-center p-2 rounded-lg bg-white border border-border">
                    <span className="text-[10px] text-text-muted block">{metric.label}</span>
                    <span className="text-base font-bold block text-slate-600">{today}</span>
                    {diff !== 0 && (
                      <span className="text-[10px] font-bold" style={{ color: diff > 0 ? '#ef4444' : '#10b981' }}>
                        {diff > 0 ? '+' : ''}{diff} vs base
                      </span>
                    )}
                    {diff === 0 && <span className="text-[10px] text-text-muted">no change</span>}
                  </div>
                )
              })}
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-lg border border-border p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Sleep</p>
                <p className="font-bold text-text">{log.sleepHours}h &middot; {SLEEP_QUALITY_LABELS[log.sleepQuality]}</p>
              </div>
              <div className="bg-white rounded-lg border border-border p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Bed / Wake</p>
                <p className="font-bold text-text font-mono text-xs">{log.bedtime} – {log.wakeTime}</p>
              </div>
            </div>

            {/* Health check-in */}
            {checkedItems > 0 && (
              <div className="bg-surface rounded-lg border border-border p-3">
                <p className="text-xs text-text font-semibold mb-1.5">Health Check-in</p>
                <div className="space-y-1">
                  {HEALTH_CHECKS.filter((c) => log.redFlags?.[c.key]).map((check) => (
                    <p key={check.key} className="text-xs text-text-muted">{check.label.replace('?', '')}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {log.notes && (
              <div className="bg-white rounded-lg border border-border p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Notes</p>
                <p className="text-xs text-text">{log.notes}</p>
              </div>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      {/* Deviation Trend Chart */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Deviation Trend</h3>
          <DeviationTrendChart logs={[...logs].sort((a, b) => a.date.localeCompare(b.date))} />
        </div>
      )}

      {/* Log table */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-text font-semibold mb-1">No logs yet</p>
          <p className="text-text-muted text-sm mb-4">Start tracking your daily condition</p>
          <button
            onClick={() => onSwitchTab('log')}
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg transition-all"
          >
            Log Today
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wide">Date</th>
                {SYMPTOM_METRICS.map((m) => (
                  <th key={m.key} className="text-center px-2 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wide">{m.label}</th>
                ))}
                <th className="text-center px-2 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wide">Sleep</th>
                <th className="text-center px-4 py-3 text-[10px] font-semibold text-text-muted uppercase tracking-wide">Deviation</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((log) => {
                const isExpanded = expandedDate === log.date
                const dateStr = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
                const weekday = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                })

                return (
                  <>
                    <tr
                      key={log.date}
                      onClick={() => toggleExpand(log.date)}
                      className={`border-b border-border/50 hover:bg-surface/50 cursor-pointer transition-colors ${isExpanded ? 'bg-surface/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text">{dateStr}</p>
                        <p className="text-[10px] text-text-muted">{weekday}</p>
                      </td>
                      {SYMPTOM_METRICS.map((metric) => {
                        const val = log[metric.key]
                        const diff = val - baseline[metric.key]
                        return (
                          <td key={metric.key} className="text-center px-2 py-3">
                            <span className="text-sm font-bold text-slate-600">{val}</span>
                            {diff !== 0 && (
                              <span className="text-[9px] font-bold ml-0.5" style={{ color: diff > 0 ? '#ef4444' : '#10b981' }}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td className="text-center px-2 py-3">
                        <span className="text-sm text-text">{log.sleepHours}h</span>
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className="text-sm font-bold text-slate-600">{log.deviationScore}</span>
                      </td>
                    </tr>
                    {isExpanded && renderLogDetail(log)}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
