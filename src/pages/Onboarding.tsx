import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBaseline } from '../hooks/useBaseline'
import { SYMPTOM_METRICS, SLEEP_QUALITY_LABELS } from '../types/baseline'
import type { BaselineProfile } from '../types/baseline'
import { getTodayDateString } from '../types/dailyLog'
import MiniSlider from '../components/MiniSlider'
import LikertScale from '../components/LikertScale'
import TimeInput from '../components/TimeInput'

const STEPS = [
  { title: 'About Your Condition', subtitle: 'Tell us about your primary condition' },
  { title: 'Symptom Baseline', subtitle: 'Rate your average day — not best, not worst' },
  { title: 'Sleep Baseline', subtitle: 'Your typical sleep pattern' },
  { title: 'Review & Confirm', subtitle: 'Confirm this represents your usual condition' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { baseline, setBaseline } = useBaseline()

  const [step, setStep] = useState(0)
  const [condition, setCondition] = useState(baseline?.primaryCondition ?? '')
  const [duration, setDuration] = useState(baseline?.conditionDurationMonths ?? 0)
  const [symptoms, setSymptoms] = useState<Record<string, number>>(() => {
    if (baseline) {
      return {
        painLevel: baseline.painLevel,
        fatigueLevel: baseline.fatigueLevel,
        breathingDifficulty: baseline.breathingDifficulty,
        functionalLimitation: baseline.functionalLimitation,
      }
    }
    return { painLevel: 0, fatigueLevel: 0, breathingDifficulty: 0, functionalLimitation: 0 }
  })
  const [sleepHours, setSleepHours] = useState(baseline?.sleepHours ?? 7)
  const [sleepQuality, setSleepQuality] = useState(baseline?.sleepQuality ?? 3)
  const [bedtime, setBedtime] = useState(baseline?.usualBedtime ?? '22:00')
  const [wakeTime, setWakeTime] = useState(baseline?.usualWakeTime ?? '06:00')
  const [confirmed, setConfirmed] = useState(false)

  const totalSteps = STEPS.length
  const progress = ((step + 1) / totalSteps) * 100

  const canProceedStep0 = condition.trim().length > 0 && duration > 0
  const canSubmit = confirmed && canProceedStep0

  const handleSubmit = () => {
    if (!canSubmit) return
    const profile: BaselineProfile = {
      primaryCondition: condition.trim(),
      conditionDurationMonths: duration,
      baselineDate: baseline?.baselineDate ?? getTodayDateString(),
      ...symptoms as Pick<BaselineProfile, 'painLevel' | 'fatigueLevel' | 'breathingDifficulty' | 'functionalLimitation'>,
      sleepHours,
      sleepQuality,
      usualBedtime: bedtime,
      usualWakeTime: wakeTime,
      createdAt: baseline?.createdAt ?? new Date().toISOString(),
    }
    setBaseline(profile)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
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
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={duration || ''}
                  onChange={(e) => setDuration(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-24 px-4 py-3 rounded-xl border border-border bg-surface text-text text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <span className="text-text-muted text-sm">months</span>
                {duration > 0 && (
                  <span className="text-xs text-text-muted">
                    ({duration >= 12 ? `${Math.floor(duration / 12)} year${Math.floor(duration / 12) > 1 ? 's' : ''}${duration % 12 > 0 ? `, ${duration % 12} mo` : ''}` : `${duration} months`})
                  </span>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Step 1: Symptom Baseline */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-center text-text-muted text-xs mb-4">
              0 = none &middot; 10 = worst imaginable
            </p>
            {SYMPTOM_METRICS.map((metric) => (
              <div key={metric.key} className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all">
                <p className="text-sm text-text-muted mb-3">{metric.question}</p>
                <MiniSlider
                  label={metric.label}
                  icon={metric.icon}
                  value={symptoms[metric.key]}
                  onChange={(v) => setSymptoms((prev) => ({ ...prev, [metric.key]: v }))}
                  color={metric.color}
                  lowLabel="None"
                  highLabel="Worst imaginable"
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Sleep Baseline */}
        {step === 2 && (
          <div className="space-y-4">
            <MiniSlider
              label="Average Sleep Hours"
              icon="🛏️"
              value={sleepHours}
              onChange={setSleepHours}
              color="#6366f1"
              min={3}
              max={12}
              lowLabel="3 hours"
              highLabel="12 hours"
            />
            <LikertScale value={sleepQuality} onChange={setSleepQuality} />
            <TimeInput label="Usual Bedtime" icon="🌙" value={bedtime} onChange={setBedtime} />
            <TimeInput label="Usual Wake Time" icon="☀️" value={wakeTime} onChange={setWakeTime} />
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-border p-6">
              <h3 className="font-semibold text-text mb-4">Your Baseline Profile</h3>

              <div className="bg-surface rounded-xl p-4 mb-4 cursor-pointer hover:bg-surface-dark transition-colors" onClick={() => setStep(0)}>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Condition</p>
                <p className="font-bold text-text">{condition}</p>
                <p className="text-xs text-text-muted mt-1">{duration} months</p>
              </div>

              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Core Symptoms</p>
              <div className="space-y-2 mb-4">
                {SYMPTOM_METRICS.map((metric) => (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between p-3 bg-surface rounded-xl cursor-pointer hover:bg-surface-dark transition-colors"
                    onClick={() => setStep(1)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{metric.icon}</span>
                      <span className="text-sm font-medium text-text">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-surface-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(symptoms[metric.key] / 10) * 100}%`, backgroundColor: metric.color }}
                        />
                      </div>
                      <span className="text-sm font-bold w-6 text-right" style={{ color: metric.color }}>
                        {symptoms[metric.key]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Sleep</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(2)}>
                  <p className="text-[10px] text-text-muted">Hours</p>
                  <p className="font-bold text-text">{sleepHours}h</p>
                </div>
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(2)}>
                  <p className="text-[10px] text-text-muted">Quality</p>
                  <p className="font-bold text-text">{SLEEP_QUALITY_LABELS[sleepQuality]}</p>
                </div>
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(2)}>
                  <p className="text-[10px] text-text-muted">Bedtime</p>
                  <p className="font-bold text-text font-mono">{bedtime}</p>
                </div>
                <div className="bg-surface rounded-xl p-3 cursor-pointer hover:bg-surface-dark" onClick={() => setStep(2)}>
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

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 max-w-lg mx-auto">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : baseline ? navigate('/dashboard') : undefined}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              step === 0 && !baseline ? 'opacity-0 pointer-events-none' : 'text-text-muted hover:text-text hover:bg-white hover:shadow-md'
            }`}
          >
            Back
          </button>

          {step === totalSteps - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                canSubmit
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Save My Baseline
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !canProceedStep0}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                step === 0 && !canProceedStep0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
              }`}
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
              onClick={() => (i === 0 || canProceedStep0) ? setStep(i) : undefined}
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
