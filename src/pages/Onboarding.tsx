import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBaseline } from '../hooks/useBaseline'
import { METRIC_CONFIGS } from '../types/baseline'
import type { BaselineProfile } from '../types/baseline'
import MetricSlider from '../components/MetricSlider'

export default function Onboarding() {
  const navigate = useNavigate()
  const { baseline, setBaseline } = useBaseline()

  const [currentStep, setCurrentStep] = useState(0)
  const [values, setValues] = useState<Record<string, number>>(() => {
    if (baseline) {
      return {
        energyLevel: baseline.energyLevel,
        painLevel: baseline.painLevel,
        moodLevel: baseline.moodLevel,
        sleepQuality: baseline.sleepQuality,
        mobility: baseline.mobility,
      }
    }
    return {
      energyLevel: 5,
      painLevel: 5,
      moodLevel: 5,
      sleepQuality: 5,
      mobility: 5,
    }
  })
  const [notes, setNotes] = useState(baseline?.notes ?? '')
  const [confirmed, setConfirmed] = useState(false)

  const totalSteps = METRIC_CONFIGS.length + 1 // metrics + review step
  const isReviewStep = currentStep === METRIC_CONFIGS.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleValueChange = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleSubmit = () => {
    if (!confirmed) return

    const profile: BaselineProfile = {
      energyLevel: values.energyLevel,
      painLevel: values.painLevel,
      moodLevel: values.moodLevel,
      sleepQuality: values.sleepQuality,
      mobility: values.mobility,
      notes,
      createdAt: new Date().toISOString(),
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
            <span className="text-sm text-text-muted font-medium">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Intro message - only on first step */}
        {currentStep === 0 && (
          <div className="mb-8 text-center animate-fade-in">
            <p className="text-text-muted text-base leading-relaxed max-w-md mx-auto">
              Your baseline represents your <strong className="text-text">usual condition</strong> — not your best day,
              not your worst day — just your normal.
            </p>
          </div>
        )}

        {/* Metric Sliders */}
        <div className="relative min-h-[400px] flex items-start justify-center">
          {METRIC_CONFIGS.map((config, index) => (
            <MetricSlider
              key={config.key}
              config={config}
              value={values[config.key]}
              onChange={(v) => handleValueChange(config.key, v)}
              isActive={currentStep === index}
            />
          ))}

          {/* Review Step */}
          {isReviewStep && (
            <div className="w-full transition-all duration-500 ease-out animate-fade-in">
              <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
                <h2 className="text-2xl font-bold text-text text-center mb-2">Review Your Baseline</h2>
                <p className="text-text-muted text-center text-sm mb-6">
                  Here's a summary of your usual condition
                </p>

                {/* Metric Summary */}
                <div className="space-y-3 mb-6">
                  {METRIC_CONFIGS.map((config) => (
                    <div
                      key={config.key}
                      className="flex items-center justify-between p-3 bg-surface rounded-xl hover:bg-surface-dark transition-colors cursor-pointer"
                      onClick={() => setCurrentStep(METRIC_CONFIGS.indexOf(config))}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{config.icon}</span>
                        <span className="font-medium text-text">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-surface-dark rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(values[config.key] / 10) * 100}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>
                        <span
                          className="text-lg font-bold w-8 text-right"
                          style={{ color: config.color }}
                        >
                          {values[config.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text mb-2">
                    Additional Notes <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else about your usual condition..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                    rows={3}
                  />
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
                    I confirm this represents my <strong>usual condition</strong> — my everyday normal, not my best or worst days.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 max-w-lg mx-auto">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`
              px-6 py-3 rounded-xl font-medium transition-all duration-200
              ${currentStep === 0
                ? 'opacity-0 pointer-events-none'
                : 'text-text-muted hover:text-text hover:bg-white hover:shadow-md'}
            `}
          >
            Back
          </button>

          {isReviewStep ? (
            <button
              onClick={handleSubmit}
              disabled={!confirmed}
              className={`
                px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200
                ${confirmed
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0'
                  : 'bg-gray-300 cursor-not-allowed'}
              `}
            >
              Save My Baseline
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Next
            </button>
          )}
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`
                rounded-full transition-all duration-300
                ${i === currentStep
                  ? 'w-8 h-2 bg-primary'
                  : i < currentStep
                    ? 'w-2 h-2 bg-primary/40'
                    : 'w-2 h-2 bg-surface-dark'}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
