import { useMemo, useCallback } from 'react'
import { useDoctor } from '../../hooks/useDoctor'
import { BaselineContext } from '../../context/baselineContext'
import { LogsContext } from '../../context/logsContext'
import { SchemaContext } from '../../context/schemaContext'
import { ViewingPatientContext } from '../../context/viewingPatientContext'
import { LOG_FORM_SCHEMA, getSliderQuestions } from '../../constants/logFormSchema'
import type { LogFormSchema } from '../../constants/logFormSchema'
import type { BaselineProfile } from '../../types/baseline'
import type { DailyLog } from '../../types/dailyLog'
import type { MetricDefinition } from '../../types/schema'
import OverviewTab from '../OverviewTab'
import HistoryTab from '../HistoryTab'
import InsightsTab from '../InsightsTab'
import ReportsTab from '../ReportsTab'

interface PatientViewProps {
  activeTab: string
  onSwitchTab: (tab: string) => void
}

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

export default function PatientView({ activeTab, onSwitchTab }: PatientViewProps) {
  const { selectedPatient } = useDoctor()

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

  return (
    <ViewingPatientContext.Provider value={patient.id}>
      <BaselineContext.Provider value={baselineCtx}>
        <LogsContext.Provider value={logsCtx}>
          <SchemaContext.Provider value={schemaCtx}>
            {activeTab === 'overview' && <OverviewTab onSwitchTab={onSwitchTab} />}
            {activeTab === 'history' && <HistoryTab onSwitchTab={onSwitchTab} />}
            {activeTab === 'insights' && <InsightsTab onSwitchTab={onSwitchTab} />}
            {activeTab === 'reports' && <ReportsTab onSwitchTab={onSwitchTab} />}
          </SchemaContext.Provider>
        </LogsContext.Provider>
      </BaselineContext.Provider>
    </ViewingPatientContext.Provider>
  )
}
