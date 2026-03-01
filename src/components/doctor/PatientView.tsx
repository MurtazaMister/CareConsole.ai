import { useState, useMemo, useCallback } from 'react'
import { useDoctor } from '../../hooks/useDoctor'
import { BaselineContext } from '../../context/baselineContext'
import { LogsContext } from '../../context/logsContext'
import { SchemaContext } from '../../context/schemaContext'
import { LOG_FORM_SCHEMA, getSliderQuestions } from '../../constants/logFormSchema'
import type { LogFormSchema } from '../../constants/logFormSchema'
import type { BaselineProfile } from '../../types/baseline'
import type { DailyLog } from '../../types/dailyLog'
import type { MetricDefinition } from '../../types/schema'
import OverviewTab from '../OverviewTab'
import HistoryTab from '../HistoryTab'
import InsightsTab from '../InsightsTab'
import ReportsTab from '../ReportsTab'

type DoctorTab = 'overview' | 'history' | 'insights' | 'reports'

const TABS: { key: DoctorTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'history', label: 'Log History', icon: '📅' },
  { key: 'insights', label: 'Insights', icon: '🔬' },
  { key: 'reports', label: 'Reports', icon: '📄' },
]

function deriveMetrics(schema: LogFormSchema): MetricDefinition[] {
  const sliders = getSliderQuestions(schema)
  return sliders.map((q) => ({
    key: q.id,
    label: q.label,
    color: q.color,
    weight: (q as { weight?: number }).weight ?? 1 / sliders.length,
    baselineKey: q.baselineKey,
  }))
}

export default function PatientView({ onBack }: { onBack: () => void }) {
  const { selectedPatient } = useDoctor()
  const [activeTab, setActiveTab] = useState<DoctorTab>('overview')

  // Cast the raw API data into typed objects for context overrides
  const baseline = selectedPatient?.baseline as BaselineProfile | null
  const logs = (selectedPatient?.logs ?? []) as unknown as DailyLog[]
  const schema = selectedPatient?.schema as LogFormSchema | null
  const effectiveSchema = schema ?? LOG_FORM_SCHEMA

  const activeMetrics = useMemo(() => deriveMetrics(effectiveSchema), [effectiveSchema])

  // Read-only context stubs
  const noop = useCallback(async () => {}, [])

  const baselineCtx = useMemo(() => ({
    baseline,
    loading: false,
    setBaseline: noop as unknown as (p: BaselineProfile) => Promise<void>,
    clearBaseline: () => {},
    fetchBaseline: noop,
  }), [baseline, noop])

  const logsCtx = useMemo(() => ({
    logs,
    loading: false,
    addLog: noop as unknown as (log: DailyLog) => Promise<void>,
    getLogByDate: (date: string) => logs.find((l) => l.date === date),
    getTodayLog: () => {
      const today = new Date().toISOString().split('T')[0]
      return logs.find((l) => l.date === today)
    },
    fetchLogs: noop,
  }), [logs, noop])

  const schemaCtx = useMemo(() => ({
    schema: effectiveSchema,
    loading: false,
    fetchSchema: noop,
    generateSchema: noop,
    activeMetrics,
  }), [effectiveSchema, activeMetrics, noop])

  if (!selectedPatient) return null

  const patient = selectedPatient.patient
  const patientBaseline = selectedPatient.baseline as BaselineProfile | null

  const baselineDateDisplay = patientBaseline?.baselineDate
    ? new Date(patientBaseline.baselineDate + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const handleSwitchTab = (tab: string) => {
    if (tab === 'overview' || tab === 'history' || tab === 'insights' || tab === 'reports') {
      setActiveTab(tab as DoctorTab)
    }
  }

  return (
    <div>
      {/* Patient header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface transition-colors text-text-muted hover:text-text"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white font-bold text-sm flex items-center justify-center">
            {patient.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">{patient.username}</h2>
            <p className="text-xs text-text-muted">
              {patientBaseline?.primaryCondition ?? 'No condition set'}
              {baselineDateDisplay ? ` · Baseline: ${baselineDateDisplay}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Doctor tab bar */}
      <div className="flex gap-1 bg-surface-dark p-1 rounded-xl mb-6">
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

      {/* Override contexts with patient data so existing tabs just work */}
      <BaselineContext.Provider value={baselineCtx}>
        <LogsContext.Provider value={logsCtx}>
          <SchemaContext.Provider value={schemaCtx}>
            {activeTab === 'overview' && <OverviewTab onSwitchTab={handleSwitchTab} />}
            {activeTab === 'history' && <HistoryTab onSwitchTab={handleSwitchTab} />}
            {activeTab === 'insights' && <InsightsTab onSwitchTab={handleSwitchTab} />}
            {activeTab === 'reports' && <ReportsTab onSwitchTab={handleSwitchTab} />}
          </SchemaContext.Provider>
        </LogsContext.Provider>
      </BaselineContext.Provider>
    </div>
  )
}
