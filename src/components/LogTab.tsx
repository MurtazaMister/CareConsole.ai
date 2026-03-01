import { useState } from 'react'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { useSchema } from '../hooks/useSchema'
import { SLEEP_QUALITY_LABELS } from '../types/baseline'
import {
  getTodayDateString,
} from '../types/dailyLog'
import type { DailyLog } from '../types/dailyLog'
import type { Tab } from './TabBar'
import {
  createFormDefaults,
  loadFormFromLog,
  getFormValue,
  setFormValue,
  getSliderQuestions,
  getToggleQuestions,
  type FormValues,
  type FormPage,
} from '../constants/logFormSchema'
import QuestionRenderer from './log/QuestionRenderer'

/** Read a value from baseline, checking responses map first then legacy top-level field */
function readBaselineVal(baseline: FormValues, key: string): unknown {
  const responses = baseline.responses as Record<string, unknown> | undefined
  if (responses && responses[key] !== undefined) return responses[key]
  return baseline[key]
}

/** Read a value from a log entry, checking responses map first then legacy top-level field */
function readLogVal(log: FormValues, key: string): unknown {
  const responses = log.responses as Record<string, unknown> | undefined
  if (responses && responses[key] !== undefined) return responses[key]
  return log[key]
}

// Steps = schema pages + review page at the end
const REVIEW_STEP = { title: 'Review & Save', subtitle: 'Check your entry before saving' }

interface LogTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function LogTab({ onSwitchTab }: LogTabProps) {
  const { baseline } = useBaseline()
  const { addLog, getLogByDate } = useLogs()
  const { schema, loading: schemaLoading } = useSchema()

  const today = getTodayDateString()
  const [selectedDate, setSelectedDate] = useState(today)
  const existingLog = getLogByDate(selectedDate)

  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormValues>(() => {
    if (!schema) return {}
    if (existingLog) return loadFormFromLog(existingLog, schema)
    return createFormDefaults(schema, baseline ?? undefined)
  })

  // Track which date the form was initialized for
  const [formDate, setFormDate] = useState(selectedDate)

  if (!baseline) return null
  if (!schema || schemaLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted text-sm">
        Loading questions...
      </div>
    )
  }

  const minDate = baseline.baselineDate ?? ''
  const isToday = selectedDate === today

  // Re-init form when selected date changes
  if (selectedDate !== formDate) {
    const logForDate = getLogByDate(selectedDate)
    if (logForDate) {
      setForm(loadFormFromLog(logForDate, schema))
    } else {
      setForm(createFormDefaults(schema, baseline))
    }
    setFormDate(selectedDate)
    setStep(0)
    setEditing(false)
  }

  const showForm = !isToday || editing

  const totalSteps = schema.pages.length + 1 // +1 for review
  const progress = ((step + 1) / totalSteps) * 100
  const isReviewStep = step === schema.pages.length
  const currentPage: FormPage | null = isReviewStep ? null : schema.pages[step]

  const stepInfo = isReviewStep
    ? REVIEW_STEP
    : { title: currentPage!.title, subtitle: currentPage!.subtitle }

  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)

    // Build responses map from all form values for dynamic storage
    const responses: Record<string, unknown> = {}
    for (const page of schema.pages) {
      for (const q of page.questions) {
        const val = getFormValue(form, q)
        if (q.type === 'toggle' && q.group) {
          if (!responses[q.group]) responses[q.group] = {}
          ;(responses[q.group] as Record<string, unknown>)[q.id] = val
        } else {
          responses[q.id] = val
        }
      }
    }

    const log: DailyLog = {
      ...(form as DailyLog),
      date: selectedDate,
      responses,
      deviationScore: 0, // computed server-side
      createdAt: existingLog?.createdAt ?? new Date().toISOString(),
    }

    try {
      await addLog(log)
      setEditing(false)
      onSwitchTab('overview')
    } catch (e) {
      console.error('Failed to save log:', e)
    } finally {
      setSaving(false)
    }
  }

  const startEditing = () => {
    if (existingLog) {
      setForm(loadFormFromLog(existingLog, schema))
    } else {
      setForm(createFormDefaults(schema, baseline))
    }
    setStep(0)
    setEditing(true)
  }

  // ── Derived data for review page ─────────────────────────
  const sliderQs = getSliderQuestions(schema)
  const toggleQs = getToggleQuestions(schema)

  const liveDeviation: Record<string, number> = {}
  let liveTotal = 0
  for (const q of sliderQs) {
    if (q.baselineKey) {
      const val = form[q.id] as number
      const base = readBaselineVal(baseline as FormValues, q.baselineKey) as number
      const diff = val - base
      liveDeviation[q.id] = diff
      liveTotal += Math.abs(diff)
    }
  }

  const activeToggleCount = toggleQs.filter((q) => getFormValue(form, q)).length

  // ── Today gate screens ───────────────────────────────────

  if (isToday && !showForm) {
    const todayLog = existingLog

    if (todayLog) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
                <div className="w-3 h-3 rounded-full bg-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text">You've already logged for today</h2>
                <p className="text-sm text-text-muted">If anything has changed, you can update your entry below.</p>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-4 mb-4">
              <div className="grid grid-cols-4 gap-3 mb-3">
                {sliderQs.map((q) => {
                  const val = readLogVal(todayLog as FormValues, q.id) as number
                  const base = q.baselineKey ? readBaselineVal(baseline as FormValues, q.baselineKey) as number : 0
                  const diff = val - base
                  return (
                    <div key={q.id} className="text-center">
                      <p className="text-[10px] text-text-muted">{q.label}</p>
                      <p className="text-lg font-bold text-slate-600">{val}</p>
                      {diff !== 0 && (
                        <p className="text-[10px] font-bold" style={{ color: diff > 0 ? '#ef4444' : '#10b981' }}>
                          {diff > 0 ? '+' : ''}{diff}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-3">
                <span>Sleep: {todayLog.sleepHours}h ({SLEEP_QUALITY_LABELS[todayLog.sleepQuality]})</span>
                <span className="text-text-muted">Deviation: {todayLog.deviationScore}</span>
              </div>
              {todayLog.notes && (
                <p className="text-xs text-text-muted mt-2 italic">"{todayLog.notes}"</p>
              )}
            </div>

            <button
              onClick={startEditing}
              className="w-full py-3 rounded-xl font-semibold text-primary border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all"
            >
              Edit Today's Log
            </button>
          </div>
        </div>
      )
    }

    // Not logged for today
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-border p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-text mb-2">You haven't logged for today</h2>
          <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
            Take a minute to record how you're feeling. Make sure to do it before going to bed.
          </p>
          <button
            onClick={startEditing}
            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            Start Logging
          </button>
        </div>
      </div>
    )
  }

  // ── Date label for past dates ────────────────────────────

  const dateLabel = isToday
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

  // ── Render question page from schema ─────────────────────

  const renderQuestionPage = (page: FormPage) => {
    if (page.layout === 'grouped') {
      return (
        <div className="bg-white rounded-2xl border border-border p-5">
          <h3 className="font-semibold text-text mb-1">{page.title}</h3>
          {page.description && (
            <p className="text-xs text-text-muted mb-4">{page.description}</p>
          )}
          <div className="space-y-3">
            {page.questions.map((q) => (
              <QuestionRenderer
                key={q.id}
                question={q}
                value={getFormValue(form, q)}
                onChange={(v) => setForm((prev) => setFormValue(prev, q, v))}
                baselineValue={q.baselineKey ? readBaselineVal(baseline as FormValues, q.baselineKey) : undefined}
              />
            ))}
          </div>
        </div>
      )
    }

    // Default: each question in its own card
    return (
      <div className="space-y-3">
        {page.questions.map((q) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={getFormValue(form, q)}
            onChange={(v) => setForm((prev) => setFormValue(prev, q, v))}
            baselineValue={q.baselineKey ? readBaselineVal(baseline as FormValues, q.baselineKey) : undefined}
          />
        ))}
      </div>
    )
  }

  // ── Render review page ───────────────────────────────────

  const renderReviewPage = () => (
    <div className="space-y-4">
      {/* Change from Baseline */}
      <div className="rounded-2xl p-5 border-2 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted mb-1">Change from Baseline</p>
            <p className="text-3xl font-bold text-text">{liveTotal}</p>
          </div>
          <p className="text-xs text-text-muted max-w-[140px] text-right">
            Total deviation across all symptoms
          </p>
        </div>
      </div>

      {/* Symptoms vs Baseline */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-text mb-3 text-sm">Symptoms vs Baseline</h3>
        {sliderQs.map((q) => {
          const val = form[q.id] as number
          const base = q.baselineKey ? readBaselineVal(baseline as FormValues, q.baselineKey) as number : 0
          const diff = liveDeviation[q.id] ?? 0
          return (
            <div key={q.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm text-text">{q.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted">Base: {base}</span>
                <span className="text-sm font-bold text-slate-600">{val}</span>
                {diff !== 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: diff > 0 ? '#ef4444' : '#10b981',
                      backgroundColor: diff > 0 ? '#fef2f2' : '#f0fdf4',
                    }}
                  >
                    {diff > 0 ? '\u2191' : '\u2193'}{Math.abs(diff)}
                  </span>
                )}
                {diff === 0 && <span className="text-[10px] text-text-muted">{'\u2192'}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-muted">Sleep</p>
          <p className="font-bold text-text">{form.sleepHours as number}h</p>
          <p className="text-[10px] text-text-muted">{SLEEP_QUALITY_LABELS[form.sleepQuality as number]}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-muted">Health Check</p>
          <p className={`font-bold ${activeToggleCount > 0 ? 'text-text' : 'text-emerald-500'}`}>
            {activeToggleCount > 0 ? `${activeToggleCount} noted` : 'All clear'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-3 text-center">
          <p className="text-[10px] text-text-muted">Bed/Wake</p>
          <p className="font-bold text-text font-mono text-xs">{form.bedtime as string}{'\u2013'}{form.wakeTime as string}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <label className="block text-sm font-medium text-text mb-1">
          Anything notable? <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          value={form.notes as string}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Brief note for your doctor..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
          rows={2}
        />
      </div>
    </div>
  )

  // ── Main form layout ─────────────────────────────────────

  return (
    <div>
      {/* Date picker */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted">Logging for</p>
            <p className="text-sm font-semibold text-text">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {isToday && (
              <button
                onClick={() => { setEditing(false) }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-text-muted border border-border hover:bg-surface-dark transition-all"
              >
                Cancel
              </button>
            )}
            {!isToday && (
              <>
                <input
                  type="date"
                  value={selectedDate}
                  min={minDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-surface text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button
                  onClick={() => setSelectedDate(today)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-all"
                >
                  Today
                </button>
              </>
            )}
          </div>
        </div>
        {existingLog && (
          <p className="text-xs text-amber-600 mt-2">Editing existing log for this date</p>
        )}
      </div>

      {/* Progress header */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-base font-semibold text-text">{stepInfo.title}</h2>
            <p className="text-text-muted text-xs">{stepInfo.subtitle}</p>
          </div>
          <span className="text-xs font-medium text-text-muted">
            Step {step + 1} of {totalSteps}
          </span>
        </div>
        <div className="h-1.5 bg-surface-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question pages from schema */}
      {currentPage && renderQuestionPage(currentPage)}

      {/* Review page */}
      {isReviewStep && renderReviewPage()}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => {
            if (step === 0) {
              if (isToday) { setEditing(false) } else { onSwitchTab('overview') }
            } else {
              setStep(step - 1)
            }
          }}
          className="px-6 py-3 rounded-xl font-medium text-text-muted hover:text-text hover:bg-white hover:shadow-md transition-all duration-200"
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {isReviewStep ? (
          <button
            onClick={handleSubmit}
            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            {existingLog ? 'Update Log' : 'Save Log'}
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
            className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Next
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-8 h-2 bg-primary' : i < step ? 'w-2 h-2 bg-primary/40' : 'w-2 h-2 bg-surface-dark'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
