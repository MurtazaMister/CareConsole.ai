import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useBaseline } from '../hooks/useBaseline'
import { METRIC_CONFIGS, getInterpretation } from '../types/baseline'

export default function Dashboard() {
  const { baseline, clearBaseline } = useBaseline()
  const navigate = useNavigate()
  const [showJson, setShowJson] = useState(true)

  if (!baseline) {
    return <Navigate to="/onboarding" replace />
  }

  const createdDate = new Date(baseline.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Your Dashboard</h1>
            <p className="text-text-muted text-sm mt-0.5">Baseline established {createdDate}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/onboarding')}
              className="px-5 py-2.5 rounded-xl font-medium text-primary border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200"
            >
              Edit Baseline
            </button>
            <button
              onClick={clearBaseline}
              className="px-5 py-2.5 rounded-xl font-medium text-danger/70 hover:text-danger hover:bg-danger/5 transition-all duration-200"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white mb-8 shadow-lg shadow-primary/20">
          <h2 className="text-2xl font-bold mb-2">Your Baseline is Set</h2>
          <p className="text-white/80 leading-relaxed">
            This is your personal reference point. Future symptom tracking will compare against these values to help detect flares early.
          </p>
        </div>

        {/* Metric Cards Grid */}
        <h3 className="text-lg font-semibold text-text mb-4">Baseline Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {METRIC_CONFIGS.map((config) => {
            const value = baseline[config.key]
            return (
              <div
                key={config.key}
                className="bg-white rounded-2xl border border-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {config.icon}
                    </span>
                    <span className="font-semibold text-text">{config.label}</span>
                  </div>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: config.color }}
                  >
                    {value}
                    <span className="text-sm font-normal text-text-muted">/10</span>
                  </span>
                </div>

                {/* Bar */}
                <div className="h-2.5 bg-surface-dark rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${(value / 10) * 100}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>

                {/* Interpretation */}
                <p className="text-xs text-text-muted leading-relaxed">
                  {getInterpretation(config.key, value)}
                </p>
              </div>
            )
          })}

          {/* Notes Card */}
          {baseline.notes && (
            <div className="bg-white rounded-2xl border border-border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-2xl">📝</span>
                <span className="font-semibold text-text">Notes</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{baseline.notes}</p>
            </div>
          )}
        </div>

        {/* JSON Output */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setShowJson(!showJson)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📋</span>
              <span className="font-semibold text-text">Baseline Data (JSON)</span>
            </div>
            <span className={`text-text-muted transition-transform duration-200 ${showJson ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {showJson && (
            <div className="px-6 pb-6">
              <pre className="bg-slate-900 text-emerald-400 rounded-xl p-5 text-sm overflow-x-auto font-mono leading-relaxed">
                {JSON.stringify(baseline, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
