export type Tab = 'overview' | 'log' | 'history'

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
  hasLoggedToday: boolean
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'log', label: 'Daily Log', icon: '📝' },
  { key: 'history', label: 'History', icon: '📅' },
]

export default function TabBar({ active, onChange, hasLoggedToday }: TabBarProps) {
  return (
    <div className="flex gap-1 bg-surface-dark p-1 rounded-xl">
      {TABS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`
            relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${active === key
              ? 'bg-white text-text shadow-sm'
              : 'text-text-muted hover:text-text hover:bg-white/50'}
          `}
        >
          <span>{icon}</span>
          <span>{label}</span>
          {key === 'log' && !hasLoggedToday && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          )}
        </button>
      ))}
    </div>
  )
}
