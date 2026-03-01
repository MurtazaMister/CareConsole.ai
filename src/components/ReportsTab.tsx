import { useState } from 'react'
import type { Tab } from './TabBar'
import type { AIReportRequest } from '../types/aiReport'
import { useFlareEngine } from '../hooks/useFlareEngine'
import { useAIReport } from '../hooks/useAIReport'
import { SYMPTOM_METRICS } from '../types/baseline'
import ReportSection from './reports/ReportSection'

interface ReportsTabProps {
  onSwitchTab: (tab: Tab) => void
}

export default function ReportsTab({ onSwitchTab }: ReportsTabProps) {
  const flareResult = useFlareEngine()
  const { state, generateReport, reset } = useAIReport()
  const [copyAllFeedback, setCopyAllFeedback] = useState(false)

  const handleGenerate = () => {
    if (!flareResult) return

    const symLabel = (key: string) =>
      SYMPTOM_METRICS.find((m) => m.key === key)?.label ?? key

    const payload: AIReportRequest = {
      flareSummary: {
        currentStatus: flareResult.summary.currentStatus,
        currentStreak: flareResult.summary.currentStreak,
        trendDirection: flareResult.summary.trendDirection,
        totalFlareWindows: flareResult.summary.totalFlareWindows,
        totalFlareDays: flareResult.summary.totalFlareDays,
        severeFlareDays: flareResult.summary.severeFlareDays,
        worstSymptom: symLabel(flareResult.summary.worstSymptom),
        averageCompositeScore: Math.round(flareResult.summary.averageCompositeScore * 100) / 100,
      },
      recentFlareWindows: flareResult.flareWindows.map((fw) => ({
        startDate: fw.startDate,
        endDate: fw.endDate,
        peakScore: Math.round(fw.peakScore * 100) / 100,
        severity: fw.peakLevel,
        durationDays: fw.durationDays,
        dominantSymptom: symLabel(fw.dominantSymptom),
      })),
      recentDailyAnalysis: flareResult.dailyAnalysis.slice(-14).map((da) => ({
        date: da.date,
        compositeScore: Math.round(da.compositeScore * 100) / 100,
        flareLevel: da.validatedFlareLevel,
        topContributors: da.contributingSymptoms.slice(0, 2).map((c) => ({
          symptom: c.label,
          contribution: Math.round(c.contribution * 100) / 100,
        })),
      })),
    }

    generateReport(payload)
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  const copyAll = async () => {
    if (state.status !== 'success') return
    const { report } = state
    const text = [
      'CLINICIAN SUMMARY',
      '='.repeat(40),
      report.clinicianSummary,
      '',
      "WHAT'S HAPPENING",
      '='.repeat(40),
      report.plainLanguageSummary,
      '',
      'QUESTIONS FOR YOUR DOCTOR',
      '='.repeat(40),
      ...report.suggestedQuestions.map((q, i) => `${i + 1}. ${q}`),
      '',
      '---',
      report.disclaimer,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopyAllFeedback(true)
    setTimeout(() => setCopyAllFeedback(false), 2000)
  }

  const downloadReport = () => {
    if (state.status !== 'success') return
    const { report } = state
    const text = [
      'CLINICIAN SUMMARY',
      '='.repeat(40),
      report.clinicianSummary,
      '',
      "WHAT'S HAPPENING",
      '='.repeat(40),
      report.plainLanguageSummary,
      '',
      'QUESTIONS FOR YOUR DOCTOR',
      '='.repeat(40),
      ...report.suggestedQuestions.map((q, i) => `${i + 1}. ${q}`),
      '',
      '---',
      report.disclaimer,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-report-${report.generatedAt.split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Not enough data
  if (!flareResult) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">Not enough data yet</h3>
        <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">
          Log at least 3 days of symptoms to generate AI-powered health reports.
        </p>
        <button
          onClick={() => onSwitchTab('log')}
          className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Log Today
        </button>
      </div>
    )
  }

  // Idle state
  if (state.status === 'idle') {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text mb-2">AI Health Report</h3>
          <p className="text-text-muted text-sm mb-6">
            Generate a comprehensive health report from your symptom data, powered by AI.
          </p>

          <div className="bg-surface/50 rounded-xl px-5 py-4 mb-6 text-left">
            <p className="text-xs font-semibold text-text mb-3 uppercase tracking-wide">Your report will include</p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-sm text-text-muted">
                <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>A structured summary for your healthcare provider with specific numbers and trends</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-text-muted">
                <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span>A plain-language explanation of what your data means</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-text-muted">
                <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Suggested questions to ask at your next doctor visit</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleGenerate}
            className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
          >
            Generate Report
          </button>

          <p className="text-xs text-text-muted mt-5">
            Reports are generated using AI and are not medical advice. Always consult your healthcare provider.
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (state.status === 'loading') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-text">Generating your report...</p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-5/6" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-4/6" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">Failed to generate report</h3>
        <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">
          {state.error}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-muted border border-border hover:bg-surface transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Success state
  const { report } = state
  const generatedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const generatedTime = new Date(report.generatedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text">AI Health Report</h3>
          <p className="text-xs text-text-muted">Generated {generatedDate} at {generatedTime}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyAll}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-text-muted border border-border rounded-lg hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            {copyAllFeedback ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied All
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All
              </>
            )}
          </button>
          <button
            onClick={downloadReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-text-muted border border-border rounded-lg hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>

      {/* Clinician Summary */}
      <ReportSection
        title="Clinician Summary"
        icon={
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        onCopy={() => copyToClipboard(report.clinicianSummary)}
      >
        <div className="whitespace-pre-wrap">{report.clinicianSummary}</div>
      </ReportSection>

      {/* What's Happening */}
      <ReportSection
        title="What's Happening"
        icon={
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        }
        onCopy={() => copyToClipboard(report.plainLanguageSummary)}
      >
        <p>{report.plainLanguageSummary}</p>
      </ReportSection>

      {/* Questions for Your Doctor */}
      <ReportSection
        title="Questions for Your Doctor"
        icon={
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        onCopy={() => copyToClipboard(report.suggestedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'))}
      >
        <ol className="space-y-3 list-decimal list-inside">
          {report.suggestedQuestions.map((question, i) => (
            <li key={i} className="leading-relaxed">{question}</li>
          ))}
        </ol>
      </ReportSection>

      {/* Regenerate + Disclaimer */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-primary border-2 border-primary/20 hover:bg-primary/5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate Report
        </button>
        <p className="text-xs text-text-muted text-center max-w-md">
          {report.disclaimer}
        </p>
      </div>
    </div>
  )
}
