import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { SYMPTOM_METRICS, SLEEP_QUALITY_LABELS } from '../types/baseline'
import type { Tab } from './TabBar'
import ChartsPanel from './charts/ChartsPanel'

interface OverviewTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function OverviewTab({ onSwitchTab }: OverviewTabProps) {
  const { baseline } = useBaseline()
  const { getTodayLog } = useLogs()

  if (!baseline) return null

  const todayLog = getTodayLog()
  const checkedItems = todayLog?.redFlags ? Object.values(todayLog.redFlags).filter(Boolean).length : 0

  return (
    <div className="space-y-6">
      {/* Today's Status */}
      {todayLog ? (
        <div className="rounded-2xl p-6 border-2 border-primary/20 shadow-sm bg-gradient-to-br from-primary/5 to-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wide font-medium">Today's Log</p>
              <p className="text-lg font-semibold text-text">Logged</p>
              <p className="text-sm text-text-muted mt-2">
                Sleep: {todayLog.sleepHours}h ({SLEEP_QUALITY_LABELS[todayLog.sleepQuality]})
                {checkedItems > 0 && (
                  <> &middot; <span className="text-text">{checkedItems} health note{checkedItems > 1 ? 's' : ''}</span></>
                )}
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
              <p className="text-white/70 text-sm">Log your daily condition to track changes from your baseline.</p>
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

      {/* Charts Dashboard */}
      <ChartsPanel />

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
                    <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/30 transition-all duration-700"
                        style={{ width: `${(baseValue / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-muted w-6 text-right">{baseValue}</span>
                  </div>
                  {todayValue !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted w-12 shrink-0">Today</span>
                      <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${(todayValue / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 text-right text-primary">
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

    </div>
  )
}
