import { useState, useMemo } from 'react'
import type { DailyLog } from '../../types/dailyLog'

interface FlareCalendarProps {
  logs: DailyLog[]
}

function getColor(score: number): string {
  if (score <= 0) return '#f0fdf4'  // green-50
  if (score <= 3) return '#86efac'  // green-300
  if (score <= 6) return '#fbbf24'  // amber-400
  if (score <= 9) return '#fb923c'  // orange-400
  return '#ef4444'                  // red-500
}

function getRiskLabel(score: number): string {
  if (score <= 3) return 'Low'
  if (score <= 6) return 'Moderate'
  if (score <= 9) return 'Elevated'
  return 'High'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function FlareCalendar({ logs }: FlareCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; score: number; x: number; y: number } | null>(null)

  const { grid, weeks } = useMemo(() => {
    if (logs.length === 0) return { grid: [], weeks: 0 }

    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))
    const logMap = new Map(sorted.map((l) => [l.date, l]))

    // Build date range from first log to today
    const start = new Date(sorted[0].date + 'T00:00:00')
    const end = new Date()
    end.setHours(0, 0, 0, 0)

    // Align start to Monday
    const startDay = start.getDay() // 0=Sun
    const mondayOffset = startDay === 0 ? -6 : 1 - startDay
    start.setDate(start.getDate() + mondayOffset)

    const cells: { date: string; score: number; hasLog: boolean; dayOfWeek: number; weekIdx: number }[] = []
    const cursor = new Date(start)
    let weekIdx = 0

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0]
      const dayOfWeek = cursor.getDay() === 0 ? 6 : cursor.getDay() - 1 // 0=Mon .. 6=Sun
      const log = logMap.get(dateStr)

      cells.push({
        date: dateStr,
        score: log?.deviationScore ?? -1,
        hasLog: !!log,
        dayOfWeek,
        weekIdx,
      })

      cursor.setDate(cursor.getDate() + 1)
      if (dayOfWeek === 6) weekIdx++
    }

    return { grid: cells, weeks: weekIdx + 1 }
  }, [logs])

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        No logs yet
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pt-0 pr-1">
          {DAYS.map((d, i) => (
            <div key={d} className="h-3 flex items-center text-[9px] text-text-muted leading-none">
              {i % 2 === 0 ? d : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto flex-1">
          <div
            className="grid gap-1"
            style={{
              gridTemplateRows: 'repeat(7, 12px)',
              gridTemplateColumns: `repeat(${weeks}, 12px)`,
              gridAutoFlow: 'column',
            }}
          >
            {grid.map((cell) => (
              <div
                key={cell.date}
                className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/40 hover:scale-125"
                style={{
                  backgroundColor: cell.hasLog ? getColor(cell.score) : '#f1f5f9',
                  opacity: cell.hasLog ? 1 : 0.4,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const parent = e.currentTarget.closest('.relative')?.getBoundingClientRect()
                  setHoveredDay({
                    date: cell.date,
                    score: cell.score,
                    x: rect.left - (parent?.left ?? 0) + 8,
                    y: rect.top - (parent?.top ?? 0) - 60,
                  })
                }}
                onMouseLeave={() => setHoveredDay(null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[10px] text-text-muted">
        <span>Less</span>
        {['#f0fdf4', '#86efac', '#fbbf24', '#fb923c', '#ef4444'].map((c) => (
          <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More deviation</span>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="absolute z-20 bg-white border border-border rounded-xl shadow-lg px-3 py-2 text-xs pointer-events-none"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          <p className="font-semibold text-text">{formatDate(hoveredDay.date)}</p>
          {hoveredDay.score >= 0 ? (
            <>
              <p className="text-text-muted mt-0.5">
                Deviation: <span className="font-bold" style={{ color: getColor(hoveredDay.score) }}>{hoveredDay.score}</span>
              </p>
              <p className="text-text-muted">Risk: {getRiskLabel(hoveredDay.score)}</p>
            </>
          ) : (
            <p className="text-text-muted mt-0.5">No log</p>
          )}
        </div>
      )}
    </div>
  )
}
