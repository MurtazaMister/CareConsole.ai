import { useState } from 'react'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { SYMPTOM_METRICS, SLEEP_QUALITY_LABELS } from '../types/baseline'
import { FLARE_RISK_CONFIG, RED_FLAGS } from '../types/dailyLog'
import type { DailyLog } from '../types/dailyLog'
import type { Tab } from './TabBar'
import TrendChart from './TrendChart'

interface HistoryTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function HistoryTab({ onSwitchTab }: HistoryTabProps) {
  const { baseline } = useBaseline()
  const { logs } = useLogs()
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [showJson, setShowJson] = useState<string | null>(null)

  if (!baseline) return null

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  const toggleExpand = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date))
    setShowJson(null)
  }

  const renderLogDetail = (log: DailyLog) => {
    const riskConfig = FLARE_RISK_CONFIG[log.flareRiskLevel]
    const hasRedFlags = log.redFlags ? Object.values(log.redFlags).some(Boolean) : false

    return (
      <div className="px-5 pb-5 space-y-4">
        {/* Core symptom grid */}
        <div className="grid grid-cols-5 gap-2">
          {SYMPTOM_METRICS.map((metric) => {
            const base = baseline[metric.key]
            const today = log[metric.key]
            const diff = today - base
            return (
              <div key={metric.key} className="text-center p-2 rounded-lg bg-surface">
                <span className="text-lg block">{metric.icon}</span>
                <span className="text-lg font-bold block" style={{ color: metric.color }}>{today}</span>
                {diff !== 0 && (
                  <span className="text-[10px] font-bold" style={{ color: diff > 0 ? '#ef4444' : '#10b981' }}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                )}
                {diff === 0 && <span className="text-[10px] text-text-muted">→</span>}
              </div>
            )
          })}
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Sleep</p>
            <p className="font-bold text-text">{log.sleepHours}h</p>
            <p className="text-[10px] text-text-muted">{SLEEP_QUALITY_LABELS[log.sleepQuality]}</p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Bed / Wake</p>
            <p className="font-bold text-text font-mono text-xs">{log.bedtime} – {log.wakeTime}</p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Flare Risk</p>
            <p className="font-bold text-xs" style={{ color: riskConfig.color }}>{riskConfig.icon} {riskConfig.label}</p>
          </div>
        </div>

        {/* Red flags */}
        {hasRedFlags && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700 font-semibold mb-1.5">Red Flags</p>
            <div className="space-y-1">
              {RED_FLAGS.filter((f) => log.redFlags?.[f.key]).map((flag) => (
                <p key={flag.key} className="text-xs text-red-600 flex items-center gap-1.5">
                  {flag.icon} {flag.label}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <div className="bg-surface rounded-lg p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Notes</p>
            <p className="text-xs text-text">{log.notes}</p>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setShowJson((prev) => prev === log.date ? null : log.date) }}
          className="text-[10px] text-primary font-medium hover:underline"
        >
          {showJson === log.date ? 'Hide JSON' : 'View JSON'}
        </button>
        {showJson === log.date && (
          <pre className="bg-slate-900 text-emerald-400 rounded-xl p-3 text-[10px] overflow-x-auto font-mono leading-relaxed max-h-48 overflow-y-auto">
            {JSON.stringify(log, null, 2)}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Trend Chart */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text">Deviation Score Trend</h3>
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Low</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> High</span>
            </div>
          </div>
          <TrendChart logs={logs} />
        </div>
      )}

      {/* Log list */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <p className="text-4xl mb-3">📝</p>
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
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          {sorted.map((log, i) => {
            const riskConfig = FLARE_RISK_CONFIG[log.flareRiskLevel]
            const logRedFlags = log.redFlags ? Object.values(log.redFlags).filter(Boolean).length : 0
            const dateStr = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            const isExpanded = expandedDate === log.date
            return (
              <div key={log.date} className={i < sorted.length - 1 ? 'border-b border-border/50' : ''}>
                <button
                  onClick={() => toggleExpand(log.date)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{riskConfig.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-text">{dateStr}</p>
                      <p className="text-[10px] text-text-muted">
                        Dev score: {log.deviationScore}
                        {logRedFlags > 0 && <span className="text-red-500 ml-2">🚨 {logRedFlags} red flag{logRedFlags > 1 ? 's' : ''}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ color: riskConfig.color, backgroundColor: riskConfig.color + '15' }}
                    >
                      {riskConfig.label}
                    </span>
                    <span className={`text-text-muted text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </button>
                {isExpanded && renderLogDetail(log)}
              </div>
            )
          })}
        </div>
      )}

      {/* Full export */}
      {logs.length > 0 && (
        <details className="bg-white rounded-2xl border border-border overflow-hidden">
          <summary className="px-5 py-4 cursor-pointer hover:bg-surface transition-colors text-sm font-semibold text-text flex items-center gap-2">
            <span>📊</span> Export All Data (JSON)
          </summary>
          <div className="px-5 pb-5">
            <pre className="bg-slate-900 text-emerald-400 rounded-xl p-4 text-[10px] overflow-x-auto font-mono leading-relaxed max-h-64 overflow-y-auto">
              {JSON.stringify({ baseline, logs: sorted }, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
