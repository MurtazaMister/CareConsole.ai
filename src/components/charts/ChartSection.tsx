import { useState, useRef, useEffect } from 'react'

interface ChartSectionProps {
  title: string
  info?: string
  defaultOpen?: boolean
  /** Serialized chart data passed to AI for summarization */
  chartData?: unknown
  children: React.ReactNode
}

export default function ChartSection({ title, info, defaultOpen = true, chartData, children }: ChartSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Close tooltip on outside click
  useEffect(() => {
    if (!showInfo) return
    const handleClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showInfo])

  const handleAiSummary = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Toggle off if already showing
    if (summaryOpen && summary) {
      setSummaryOpen(false)
      return
    }

    // If already fetched, just show it
    if (summary) {
      setSummaryOpen(true)
      return
    }

    setSummaryLoading(true)
    setSummaryOpen(true)
    try {
      const res = await fetch('/api/ai/summarize-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chartTitle: title, chartData }),
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary || 'No summary available.')
      } else {
        setSummary('Could not generate summary. Please try again.')
      }
    } catch {
      setSummary('Something went wrong. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {info && (
            <div className="relative" ref={infoRef}>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  setShowInfo(!showInfo)
                }}
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-help"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              {showInfo && (
                <div className="absolute left-0 top-6 z-30 w-56 bg-white border border-border rounded-xl shadow-lg px-3.5 py-2.5 text-xs text-text-muted leading-relaxed text-justify">
                  {info}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI Summary button */}
          {chartData && open && (
            <span
              onClick={handleAiSummary}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                summaryOpen
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:text-primary hover:bg-primary/5'
              }`}
            >
              {summaryLoading ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" fill="currentColor" />
                </svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              )}
              AI Summary
            </span>
          )}

          <svg
            className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {/* AI Summary panel */}
          {summaryOpen && (
            <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-primary/5 to-indigo-50 border border-primary/15">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                {summaryLoading ? (
                  <p className="text-xs text-text-muted animate-pulse">Analyzing your data...</p>
                ) : (
                  <p className="text-xs text-text leading-relaxed">{summary}</p>
                )}
              </div>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
