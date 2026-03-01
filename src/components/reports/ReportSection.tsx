import { useState } from 'react'

interface ReportSectionProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
  onCopy: () => void
  defaultCollapsed?: boolean
}

export default function ReportSection({ title, subtitle, icon, children, onCopy, defaultCollapsed = false }: ReportSectionProps) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {defaultCollapsed && (
            <button onClick={() => setCollapsed(!collapsed)} className="flex-shrink-0">
              <svg
                className={`w-4 h-4 text-text-muted transition-transform ${collapsed ? '' : 'rotate-90'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {icon}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text">{title}</h3>
            {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors flex-shrink-0"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {!collapsed && (
        <div className="px-5 py-4 text-sm text-text leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}
