import { useState } from 'react'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { SYMPTOM_METRICS, SLEEP_QUALITY_LABELS } from '../types/baseline'
import { FLARE_RISK_CONFIG } from '../types/dailyLog'
import type { Tab } from './TabBar'

interface OverviewTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function OverviewTab({ onSwitchTab }: OverviewTabProps) {
  const { baseline } = useBaseline()
  const { getTodayLog, logs } = useLogs()
  const [showJson, setShowJson] = useState(false)

  if (!baseline) return null

  const todayLog = getTodayLog()
  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  const hasRedFlags = todayLog?.redFlags ? Object.values(todayLog.redFlags).some(Boolean) : false
  const redFlagCount = todayLog?.redFlags ? Object.values(todayLog.redFlags).filter(Boolean).length : 0

  return (
    <div className="space-y-6">
      {/* Today's Status */}
      {todayLog ? (
        <div
          className="rounded-2xl p-6 border-2 shadow-sm"
          style={{
            borderColor: FLARE_RISK_CONFIG[todayLog.flareRiskLevel].color + '30',
            background: `linear-gradient(135deg, ${FLARE_RISK_CONFIG[todayLog.flareRiskLevel].color}08, white)`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wide font-medium">Today's Status</p>
              <span
                className="text-xl font-bold px-4 py-1.5 rounded-full inline-block"
                style={{
                  color: FLARE_RISK_CONFIG[todayLog.flareRiskLevel].color,
                  backgroundColor: FLARE_RISK_CONFIG[todayLog.flareRiskLevel].color + '15',
                }}
              >
                {FLARE_RISK_CONFIG[todayLog.flareRiskLevel].icon} {FLARE_RISK_CONFIG[todayLog.flareRiskLevel].label}
              </span>
              <p className="text-sm text-text-muted mt-2">
                Deviation score: <strong className="text-text">{todayLog.deviationScore}</strong> &middot;{' '}
                Sleep: {todayLog.sleepHours}h ({SLEEP_QUALITY_LABELS[todayLog.sleepQuality]}) &middot;{' '}
                {hasRedFlags
                  ? <span className="text-red-500 font-medium">🚨 {redFlagCount} red flag{redFlagCount > 1 ? 's' : ''}</span>
                  : <span className="text-emerald-500">✅ No red flags</span>}
              </p>
            </div>
            <button
              onClick={() => onSwitchTab('log')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all shrink-0"
            >
              Edit Today's Log
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">How are you feeling today?</h2>
              <p className="text-white/70 text-sm">Log your daily condition to track deviations from your baseline.</p>
            </div>
            <button
              onClick={() => onSwitchTab('log')}
              className="px-6 py-3 rounded-xl font-semibold text-primary bg-white hover:bg-white/90 hover:shadow-lg transition-all duration-200 shrink-0"
            >
              Log Today
            </button>
          </div>
        </div>
      )}

      {/* Metric Comparison Cards */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-3">
          {todayLog ? 'Today vs Baseline' : 'Your Baseline'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SYMPTOM_METRICS.map((metric) => {
            const baseValue = baseline[metric.key]
            const todayValue = todayLog?.[metric.key] as number | undefined
            const diff = todayValue !== undefined ? todayValue - baseValue : undefined

            return (
              <div
                key={metric.key}
                className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl group-hover:scale-110 transition-transform">{metric.icon}</span>
                    <span className="font-medium text-text text-sm">{metric.label}</span>
                  </div>
                  {diff !== undefined && diff !== 0 && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: diff > 0 ? '#ef4444' : '#10b981',
                        backgroundColor: diff > 0 ? '#fef2f2' : '#f0fdf4',
                      }}
                    >
                      {diff > 0 ? '↑' : '↓'}{Math.abs(diff)}
                    </span>
                  )}
                  {diff === 0 && (
                    <span className="text-xs text-text-muted font-medium">→ No change</span>
                  )}
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted w-12 shrink-0">Baseline</span>
                    <div className="flex-1 h-2 bg-surface-dark rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 opacity-40"
                        style={{ width: `${(baseValue / 10) * 100}%`, backgroundColor: metric.color }}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-muted w-6 text-right">{baseValue}</span>
                  </div>
                  {todayValue !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-12 shrink-0">Today</span>
                      <div className="flex-1 h-2 bg-surface-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(todayValue / 10) * 100}%`, backgroundColor: metric.color }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 text-right" style={{ color: metric.color }}>
                        {todayValue}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-text-muted">
                  {todayValue !== undefined
                    ? diff === 0
                      ? 'Same as your baseline.'
                      : `${Math.abs(diff!)} point${Math.abs(diff!) > 1 ? 's' : ''} ${diff! > 0 ? 'above' : 'below'} baseline.`
                    : `Baseline: ${baseValue}/10`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sleep & Red Flags Quick View (only when log exists) */}
      {todayLog && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-border p-5">
            <h4 className="text-xs text-text-muted uppercase tracking-wide font-medium mb-3">Sleep Last Night</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-text">{todayLog.sleepHours}h</p>
                <p className="text-[10px] text-text-muted">
                  Base: {baseline.sleepHours}h
                  {todayLog.sleepHours !== baseline.sleepHours && (
                    <span style={{ color: todayLog.sleepHours < baseline.sleepHours ? '#ef4444' : '#10b981' }}>
                      {' '}{todayLog.sleepHours > baseline.sleepHours ? '+' : ''}{todayLog.sleepHours - baseline.sleepHours}h
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-500">{SLEEP_QUALITY_LABELS[todayLog.sleepQuality]}</p>
                <p className="text-[10px] text-text-muted">Quality ({todayLog.sleepQuality}/5)</p>
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-text-muted font-mono">
              <span>🌙 {todayLog.bedtime}</span>
              <span>☀️ {todayLog.wakeTime}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5">
            <h4 className="text-xs text-text-muted uppercase tracking-wide font-medium mb-3">Red Flags</h4>
            {hasRedFlags ? (
              <div className="space-y-2">
                {todayLog.redFlags?.chestPainWeaknessConfusion && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">🚨 Chest pain / weakness / confusion</p>
                )}
                {todayLog.redFlags?.feverSweatsChills && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">🤒 Fever / sweats / chills</p>
                )}
                {todayLog.redFlags?.missedOrNewMedication && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">💊 Missed / new medication</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <p className="text-sm text-emerald-600 font-medium">All clear</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {todayLog?.notes && (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h4 className="text-xs text-text-muted uppercase tracking-wide font-medium mb-2">Today's Note</h4>
          <p className="text-sm text-text">{todayLog.notes}</p>
        </div>
      )}

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text">Recent Logs</h3>
            <button onClick={() => onSwitchTab('history')} className="text-xs text-primary font-medium hover:underline">
              View all &rarr;
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {recentLogs.map((log, i) => {
              const riskConfig = FLARE_RISK_CONFIG[log.flareRiskLevel]
              const logRedFlags = log.redFlags ? Object.values(log.redFlags).filter(Boolean).length : 0
              const dateStr = new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              return (
                <div
                  key={log.date}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-surface transition-colors ${
                    i < recentLogs.length - 1 ? 'border-b border-border/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{riskConfig.icon}</span>
                    <span className="text-sm font-medium text-text">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {logRedFlags > 0 && (
                      <span className="text-xs text-red-500 font-medium">
                        🚨 {logRedFlags}
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      Dev: <strong>{log.deviationScore}</strong>
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ color: riskConfig.color, backgroundColor: riskConfig.color + '15' }}
                    >
                      {riskConfig.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* JSON */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setShowJson(!showJson)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="font-semibold text-text text-sm">Raw Data (JSON)</span>
          </div>
          <span className={`text-text-muted text-sm transition-transform duration-200 ${showJson ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {showJson && (
          <div className="px-5 pb-5">
            <pre className="bg-slate-900 text-emerald-400 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed max-h-80 overflow-y-auto">
              {JSON.stringify({ baseline, todayLog: todayLog ?? null, totalLogs: logs.length }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
