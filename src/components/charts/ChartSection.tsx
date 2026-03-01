import { useState, useRef, useEffect } from 'react'

interface ChartSectionProps {
  title: string
  info?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function ChartSection({ title, info, defaultOpen = true, children }: ChartSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

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
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}
