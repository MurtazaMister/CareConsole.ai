import { useState } from 'react'
import { useBaseline } from '../hooks/useBaseline'
import { useLogs } from '../hooks/useLogs'
import { SYMPTOM_METRICS, SLEEP_QUALITY_LABELS } from '../types/baseline'
import {
  HEALTH_CHECKS,
  calculateDeviation,
  getTodayDateString,
  createEmptyLogForm,
} from '../types/dailyLog'
import type { DailyLog } from '../types/dailyLog'
import type { Tab } from './TabBar'
import MiniSlider from './MiniSlider'
import LikertScale from './LikertScale'
import TimeInput from './TimeInput'

const STEPS = [
  { title: 'Rate your core symptoms', subtitle: 'Takes 30 seconds' },
  { title: 'Health Check-in', subtitle: 'Quick yes/no questions' },
  { title: 'Sleep', subtitle: 'How did you sleep?' },
  { title: 'Review & Save', subtitle: 'Check your entry before saving' },
]

interface LogTabProps {
  onSwitchTab: (tab: Tab) => void
}

function loadFormFromLog(log: DailyLog) {
  return {
    painLevel: log.painLevel,
    fatigueLevel: log.fatigueLevel,
    breathingDifficulty: log.breathingDifficulty,
    functionalLimitation: log.functionalLimitation,
    redFlags: log.redFlags ? { ...log.redFlags } : {
      chestPainWeaknessConfusion: false,
      feverSweatsChills: false,
      missedOrNewMedication: false,
    },
    sleepHours: log.sleepHours,
    sleepQuality: log.sleepQuality,
    bedtime: log.bedtime,
    wakeTime: log.wakeTime,
    notes: log.notes,
  }
}

export default function LogTab({ onSwitchTab }: LogTabProps) {
  const { baseline } = useBaseline()
  const { addLog, getLogByDate } = useLogs()

  const today = getTodayDateString()
  const [selectedDate, setSelectedDate] = useState(today)
  const existingLog = getLogByDate(selectedDate)

  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => {
    if (existingLog) return loadFormFromLog(existingLog)
    return createEmptyLogForm(baseline ?? undefined)
  })

  // Track which date the form was initialized for
  const [formDate, setFormDate] = useState(selectedDate)

  if (!baseline) return null

  const minDate = baseline.baselineDate ?? ''
  const isToday = selectedDate === today

  // Re-init form when selected date changes
  if (selectedDate !== formDate) {
    const logForDate = getLogByDate(selectedDate)
    if (logForDate) {
      setForm(loadFormFromLog(logForDate))
    } else {
      setForm(createEmptyLogForm(baseline))
    }
    setFormDate(selectedDate)
    setStep(0)
    setEditing(false)
  }

  // For today, gate behind the message screens unless editing
  // For past dates, go straight to the form
  const showForm = !isToday || editing

  const totalSteps = STEPS.length
  const progress = ((step + 1) / totalSteps) * 100

  const updateSymptom = (key: string, value: number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleHealthCheck = (key: keyof typeof form.redFlags) => {
    setForm((prev) => ({ ...prev, redFlags: { ...prev.redFlags, [key]: !prev.redFlags[key] } }))
  }

  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    const { total } = calculateDeviation(form, baseline)

    const log: DailyLog = {
      ...form,
      date: selectedDate,
      deviationScore: total,
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
      setForm(loadFormFromLog(existingLog))
    } else {
      setForm(createEmptyLogForm(baseline))
    }
    setStep(0)
    setEditing(true)
  }

  const { perMetric: liveDeviation, total: liveTotal } = calculateDeviation(form, baseline)
  const hasCheckedItems = Object.values(form.redFlags).some(Boolean)

  // Today gate screens
  if (isToday && !showForm) {
    const todayLog = existingLog

    if (todayLog) {
      // Already logged for today
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

            {/* Quick summary of today's log */}
            <div className="bg-surface rounded-xl p-4 mb-4">
              <div className="grid grid-cols-4 gap-3 mb-3">
                {SYMPTOM_METRICS.map((metric) => {
                  const val = todayLog[metric.key]
                  const diff = val - baseline[metric.key]
                  return (
                    <div key={metric.key} className="text-center">
                      <p className="text-[10px] text-text-muted">{metric.label}</p>
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

  // Date label for past dates
  const dateLabel = isToday
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

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
            <h2 className="text-base font-semibold text-text">{STEPS[step].title}</h2>
            <p className="text-text-muted text-xs">{STEPS[step].subtitle}</p>
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

      {/* Step 0: Core Symptoms */}
      {step === 0 && (
        <div className="space-y-3">
          {SYMPTOM_METRICS.map((metric) => (
            <div key={metric.key} className="bg-white rounded-xl border border-border px-4 py-3">
              <p className="text-sm font-medium text-text mb-2">{metric.dailyQuestion}</p>
              <MiniSlider
                label={metric.label}
                icon=""
                showIcon={false}
                value={form[metric.key as keyof typeof form] as number}
                onChange={(v) => updateSymptom(metric.key, v)}
                color="#64748b"
                trackStyle="intensity"
                baselineValue={baseline[metric.key]}
              />
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Health Check-in */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-text mb-1">Health Check-in</h3>
            <p className="text-xs text-text-muted mb-4">Have you experienced any of the following?</p>
            <div className="space-y-3">
              {HEALTH_CHECKS.map((check) => {
                const isActive = form.redFlags[check.key]
                return (
                  <button
                    key={check.key}
                    onClick={() => toggleHealthCheck(check.key)}
                    className={`
                      w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 border-2
                      ${isActive
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-white hover:border-gray-300'}
                    `}
                  >
                    <span className={`text-sm font-medium ${isActive ? 'text-text' : 'text-text'}`}>
                      {check.label}
                    </span>
                    <div className={`
                      w-14 h-8 rounded-full transition-all duration-200 flex items-center px-1
                      ${isActive ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'}
                    `}>
                      <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Sleep */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text text-sm">Hours Slept</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={form.sleepHours || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, sleepHours: Math.max(0, Math.min(24, Number(e.target.value))) }))}
                  placeholder="7"
                  className="w-24 px-3 py-2 rounded-lg border border-border bg-surface text-text text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <span className="text-sm text-text-muted">hours</span>
              </div>
            </div>
            {baseline.sleepHours !== undefined && (
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-text-muted">
                <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
                Baseline: {baseline.sleepHours} hours
              </div>
            )}
          </div>
          <LikertScale
            value={form.sleepQuality}
            onChange={(v) => setForm((prev) => ({ ...prev, sleepQuality: v }))}
            baselineValue={baseline.sleepQuality}
            showIcon={false}
            variant="neutral"
          />
          <TimeInput
            label="Bedtime"
            icon=""
            value={form.bedtime}
            onChange={(v) => setForm((prev) => ({ ...prev, bedtime: v }))}
            baselineValue={baseline.usualBedtime}
            showIcon={false}
            showDropdownArrow
          />
          <TimeInput
            label="Wake Time"
            icon=""
            value={form.wakeTime}
            onChange={(v) => setForm((prev) => ({ ...prev, wakeTime: v }))}
            baselineValue={baseline.usualWakeTime}
            showIcon={false}
            showDropdownArrow
          />
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
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

          {/* Metrics vs baseline */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-text mb-3 text-sm">Symptoms vs Baseline</h3>
            {SYMPTOM_METRICS.map((metric) => {
              const val = form[metric.key as keyof typeof form] as number
              const base = baseline[metric.key]
              const diff = liveDeviation[metric.key]
              return (
                <div key={metric.key} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text">{metric.label}</span>
                  </div>
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
                        {diff > 0 ? '↑' : '↓'}{Math.abs(diff)}
                      </span>
                    )}
                    {diff === 0 && <span className="text-[10px] text-text-muted">→</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] text-text-muted">Sleep</p>
              <p className="font-bold text-text">{form.sleepHours}h</p>
              <p className="text-[10px] text-text-muted">{SLEEP_QUALITY_LABELS[form.sleepQuality]}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] text-text-muted">Health Check</p>
              <p className={`font-bold ${hasCheckedItems ? 'text-text' : 'text-emerald-500'}`}>
                {hasCheckedItems
                  ? `${Object.values(form.redFlags).filter(Boolean).length} noted`
                  : 'All clear'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-border p-3 text-center">
              <p className="text-[10px] text-text-muted">Bed/Wake</p>
              <p className="font-bold text-text font-mono text-xs">{form.bedtime}–{form.wakeTime}</p>
            </div>
          </div>

          {/* Note */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <label className="block text-sm font-medium text-text mb-1">
              Anything notable? <span className="text-text-muted font-normal">(optional, 150 chars)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value.slice(0, 150) }))}
              placeholder="Brief note for your doctor..."
              maxLength={150}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
              rows={2}
            />
            <p className="text-right text-[10px] text-text-muted mt-1">{form.notes.length}/150</p>
          </div>
        </div>
      )}

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

        {step === totalSteps - 1 ? (
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
