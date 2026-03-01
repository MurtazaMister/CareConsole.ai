import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBaseline } from '../hooks/useBaseline'
import { SLEEP_QUALITY_LABELS } from '../types/baseline'
import type { BaselineProfile } from '../types/baseline'
import { getTodayDateString } from '../types/dailyLog'
import { useSchema } from '../hooks/useSchema'
import MiniSlider from '../components/MiniSlider'
import LikertScale from '../components/LikertScale'
import TimeInput from '../components/TimeInput'

interface SymptomInfo {
  key: string
  label: string
  selected: boolean
}

const STEPS = [
  { title: 'About Your Condition', subtitle: 'Tell us about your primary condition' },
  { title: 'Confirm Symptoms', subtitle: 'AI-suggested symptoms for your condition' },
  { title: 'Symptom Baseline', subtitle: 'Rate your average day — not best, not worst' },
  { title: 'Sleep Baseline', subtitle: 'Your typical sleep pattern' },
  { title: 'Review & Confirm', subtitle: 'Confirm this represents your usual condition' },
]

// ── Color palette for sliders ──────────────────────────────

const SLIDER_COLORS = [
  '#ef4444', '#f59e0b', '#06b6d4', '#6366f1',
  '#8b5cf6', '#ec4899', '#10b981', '#f97316',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { baseline, setBaseline, fetchBaseline } = useBaseline()
  const { fetchSchema } = useSchema()

  useEffect(() => {
    fetchBaseline()
  }, [fetchBaseline])

  const [step, setStep] = useState(0)
  const [condition, setCondition] = useState(baseline?.primaryCondition ?? '')
  const [duration, setDuration] = useState(baseline?.conditionDurationMonths ?? 0)
  const [durationUnit, setDurationUnit] = useState<'weeks' | 'months' | 'years'>('months')

  // AI symptom lookup state
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [symptoms, setSymptoms] = useState<SymptomInfo[]>([])
  const [isRareDisease, setIsRareDisease] = useState(false)
  const [customSymptom, setCustomSymptom] = useState('')

  // Schema initialization state
  const [initializing, setInitializing] = useState(false)

  // Baseline ratings (dynamic)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [sleepHours, setSleepHours] = useState(baseline?.sleepHours ?? 7)
  const [sleepQuality, setSleepQuality] = useState(baseline?.sleepQuality ?? 3)
  const [bedtime, setBedtime] = useState(baseline?.usualBedtime ?? '22:00')
  const [wakeTime, setWakeTime] = useState(baseline?.usualWakeTime ?? '06:00')
  const [confirmed, setConfirmed] = useState(false)

  const totalSteps = STEPS.length
  const progress = ((step + 1) / totalSteps) * 100

  const canProceedStep0 = condition.trim().length > 0 && duration > 0
  const selectedSymptoms = symptoms.filter((s) => s.selected)
  const canProceedStep1 = selectedSymptoms.length > 0
  const canSubmit = confirmed && canProceedStep0 && selectedSymptoms.length > 0

  const getDurationMonths = () => {
    if (durationUnit === 'weeks') return Math.max(0, Math.round(duration / 4))
    if (durationUnit === 'years') return Math.max(0, duration * 12)
    return Math.max(0, duration)
  }

  const getDurationDisplay = () => {
    if (duration <= 0) return ''
    if (durationUnit === 'weeks') return `${duration} week${duration === 1 ? '' : 's'}`
    if (durationUnit === 'years') return `${duration} year${duration === 1 ? '' : 's'}`
    return duration >= 12
      ? `${Math.floor(duration / 12)} year${Math.floor(duration / 12) > 1 ? 's' : ''}${duration % 12 > 0 ? `, ${duration % 12} mo` : ''}`
      : `${duration} months`
  }

  // Call AI to look up symptoms when proceeding from step 0
  const handleLookup = async () => {
    if (!canProceedStep0) return
    setLookingUp(true)
    setLookupError('')
    try {
      const res = await fetch('/api/disease/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ disease: condition.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to look up symptoms')
      }
      const data = await res.json()
      setIsRareDisease(!data.known)

      if (data.symptoms && data.symptoms.length > 0) {
        setSymptoms(
          data.symptoms.map((key: string) => ({
            key,
            label: data.labels?.[key] || key,
            selected: true,
          })),
        )
        // Initialize ratings for all symptoms
        const initialRatings: Record<string, number> = {}
        for (const key of data.symptoms) {
          initialRatings[key] = 0
        }
        setRatings(initialRatings)
      } else {
        setSymptoms([])
        setIsRareDisease(true)
      }
      setStep(1)
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Failed to look up symptoms')
    } finally {
      setLookingUp(false)
    }
  }

  // Add a custom symptom
  const handleAddCustom = () => {
    const name = customSymptom.trim()
    if (!name) return
    // Generate camelCase key
    const key = name
      .split(/\s+/)
      .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
      .join('')

    if (symptoms.some((s) => s.key === key)) return

    setSymptoms([...symptoms, { key, label: name, selected: true }])
    setRatings((prev) => ({ ...prev, [key]: 0 }))
    setCustomSymptom('')
  }

  // Initialize schema when confirming symptoms
  const handleInitialize = async () => {
    if (!canProceedStep1) return
    setInitializing(true)
    try {
      const selected = symptoms.filter((s) => s.selected)
      const labels: Record<string, string> = {}
      for (const s of selected) {
        labels[s.key] = s.label
      }
      const res = await fetch('/api/disease/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          disease: condition.trim(),
          symptoms: selected.map((s) => s.key),
          labels,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to initialize schema')
      }
      // Load the newly created schema into context so Dashboard has it
      await fetchSchema()
      setStep(2)
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Failed to initialize')
    } finally {
      setInitializing(false)
    }
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError('')

    const selected = symptoms.filter((s) => s.selected)
    const responses: Record<string, number> = {}
    for (const s of selected) {
      responses[s.key] = ratings[s.key] ?? 0
    }

    const profile: BaselineProfile = {
      primaryCondition: condition.trim(),
      conditionDurationMonths: getDurationMonths(),
      baselineDate: baseline?.baselineDate ?? getTodayDateString(),
      finalMetrics: selected.map((s) => s.key),
      sleepHours,
      sleepQuality,
      usualBedtime: bedtime,
      usualWakeTime: wakeTime,
      responses,
      createdAt: baseline?.createdAt ?? new Date().toISOString(),
    }
    try {
      await setBaseline(profile)
      navigate('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save baseline')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-text">
              {baseline ? 'Edit Your Baseline' : 'Set Your Baseline'}
            </h1>
            <span className="text-sm text-text-muted font-medium">{step + 1} / {totalSteps}</span>
          </div>
          <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Step 0: Condition Info */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <p className="text-text-muted text-sm leading-relaxed max-w-md mx-auto">
                Your baseline represents your <strong className="text-text">usual condition</strong> — not your best day,
                not your worst day — just your normal while living with the disease.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6">
              <label className="block text-sm font-medium text-text mb-2">
                What is your primary diagnosed condition or main symptom?
              </label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="e.g. Lupus, Sickle Cell Disease, Chronic Fatigue..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div className="bg-white rounded-2xl border border-border p-6">
              <label className="block text-sm font-medium text-text mb-2">
                Roughly how long have you been dealing with this?
              </label>
              <div className="flex items-center gap-4 flex-wrap">
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={duration || ''}
                  onChange={(e) => setDuration(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-24 px-4 py-3 rounded-xl border border-border bg-surface text-text text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <div className="flex gap-2">
                  {(['weeks', 'months', 'years'] as const).map((unit) => (
                    <button
                      key={unit}
                      onClick={() => setDurationUnit(unit)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        durationUnit === unit
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-text-muted hover:border-gray-300 hover:bg-surface-dark'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
                {duration > 0 && (
                  <span className="text-xs text-text-muted">
                    ({getDurationDisplay()})
                  </span>
                )}
              </div>
            </div>

            {lookupError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm text-center">{lookupError}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Symptom Confirmation */}
        {step === 1 && (
          <div className="space-y-4">
            {isRareDisease && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-amber-700 text-sm">
                  We couldn't find standard symptoms for this condition. Please add your symptoms manually below.
                </p>
              </div>
            )}

            {symptoms.length > 0 && (
              <div className="bg-white rounded-2xl border border-border p-6">
                <p className="text-sm font-medium text-text mb-3">
                  {isRareDisease ? 'Your symptoms' : 'AI-suggested symptoms for your condition'}
                </p>
                <p className="text-xs text-text-muted mb-4">Select the symptoms you want to track daily</p>
                <div className="space-y-2">
                  {symptoms.map((symptom) => (
                    <label
                      key={symptom.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        symptom.selected
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={symptom.selected}
                        onChange={() => {
                          setSymptoms(symptoms.map((s) =>
                            s.key === symptom.key ? { ...s, selected: !s.selected } : s,
                          ))
                        }}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary/30 accent-primary"
                      />
                      <span className="text-sm font-medium text-text">{symptom.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Add custom symptom */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <p className="text-sm font-medium text-text mb-2">Add a custom symptom</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  placeholder="e.g. Brain Fog, Joint Swelling..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  onClick={handleAddCustom}
                  disabled={!customSymptom.trim()}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    customSymptom.trim()
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Baseline Ratings (Dynamic) */}
        {step === 2 && (
          <div className="space-y-3">
            {selectedSymptoms.map((symptom, i) => (
              <div key={symptom.key} className="bg-white rounded-xl border border-border px-4 py-3">
                <p className="text-sm font-medium text-text mb-2">
                  On an average day, how would you rate your {symptom.label.toLowerCase()}?
                </p>
                <MiniSlider
                  label={symptom.label}
                  icon=""
                  showIcon={false}
                  value={ratings[symptom.key] ?? 0}
                  onChange={(v) => setRatings((prev) => ({ ...prev, [symptom.key]: v }))}
                  color={SLIDER_COLORS[i % SLIDER_COLORS.length]}
                  trackStyle="intensity"
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Sleep Baseline */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text text-sm">Average Sleep Hours</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={sleepHours || ''}
                    onChange={(e) => setSleepHours(Math.max(0, Math.min(24, Number(e.target.value))))}
                    placeholder="7"
                    className="w-24 px-3 py-2 rounded-lg border border-border bg-surface text-text text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <span className="text-sm text-text-muted">hours</span>
                </div>
              </div>
            </div>
            <LikertScale value={sleepQuality} onChange={setSleepQuality} showIcon={false} variant="neutral" />
            <TimeInput label="Usual Bedtime" icon="🌙" value={bedtime} onChange={setBedtime} showIcon={false} showDropdownArrow />
            <TimeInput label="Usual Wake Time" icon="☀️" value={wakeTime} onChange={setWakeTime} showIcon={false} showDropdownArrow />
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="font-semibold text-text mb-4">Your Baseline Profile</h3>

              <div className="bg-surface rounded-xl p-4 mb-4 cursor-pointer hover:bg-surface-dark transition-colors" onClick={() => setStep(0)}>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Condition</p>
                <p className="font-bold text-text">{condition}</p>
                <p className="text-xs text-text-muted mt-1">{duration} {durationUnit}</p>
              </div>

              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Tracked Symptoms</p>
              <div className="space-y-2 mb-4">
                {selectedSymptoms.map((symptom, i) => (
                  <div
                    key={symptom.key}
                    className="flex items-center justify-between p-3 bg-surface rounded-xl cursor-pointer hover:bg-surface-dark transition-colors"
                    onClick={() => setStep(2)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{symptom.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-surface-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${((ratings[symptom.key] ?? 0) / 10) * 100}%`,
                            backgroundColor: SLIDER_COLORS[i % SLIDER_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold w-6 text-right text-slate-600">
                        {ratings[symptom.key] ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Sleep</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(3)}>
                  <p className="text-[10px] text-text-muted">Hours</p>
                  <p className="font-bold text-text">{sleepHours}h</p>
                </div>
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(3)}>
                  <p className="text-[10px] text-text-muted">Quality</p>
                  <p className="font-bold text-text">{SLEEP_QUALITY_LABELS[sleepQuality]}</p>
                </div>
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(3)}>
                  <p className="text-[10px] text-text-muted">Bedtime</p>
                  <p className="font-bold text-text font-mono">{bedtime}</p>
                </div>
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(3)}>
                  <p className="text-[10px] text-text-muted">Wake</p>
                  <p className="font-bold text-text font-mono">{wakeTime}</p>
                </div>
              </div>

              {/* Confirmation */}
              <label className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-border text-primary focus:ring-primary/30 accent-primary"
                />
                <span className="text-sm text-text leading-relaxed">
                  I confirm this represents my <strong>usual condition</strong> — my everyday normal while living with my disease.
                </span>
              </label>
            </div>
          </div>
        )}

        {(error || lookupError) && step !== 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-4">
            <p className="text-red-600 text-sm text-center">{error || lookupError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 max-w-lg mx-auto">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : baseline ? navigate('/dashboard') : undefined}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer ${
              step === 0 && !baseline ? 'opacity-0 pointer-events-none' : 'text-text-muted hover:text-text hover:bg-white hover:shadow-md'
            }`}
          >
            Back
          </button>

          {step === 0 ? (
            <button
              onClick={handleLookup}
              disabled={!canProceedStep0 || lookingUp}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer ${
                canProceedStep0 && !lookingUp
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {lookingUp ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Looking up symptoms...
                </span>
              ) : 'Next'}
            </button>
          ) : step === 1 ? (
            <button
              onClick={handleInitialize}
              disabled={!canProceedStep1 || initializing}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer ${
                canProceedStep1 && !initializing
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Setting up...
                </span>
              ) : 'Confirm Symptoms'}
            </button>
          ) : step === totalSteps - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer ${
                canSubmit && !saving
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save My Baseline'}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              Next
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i <= step) setStep(i)
              }}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-8 h-2 bg-primary' : i < step ? 'w-2 h-2 bg-primary/40' : 'w-2 h-2 bg-surface-dark'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
