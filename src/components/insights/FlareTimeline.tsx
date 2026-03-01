import { FLARE_LEVEL_CONFIG } from '../../constants/flareTheme'
import type { FlareWindow } from '../../lib/flareEngine'

interface FlareTimelineProps {
  flareWindows: FlareWindow[]
  totalDateRange: { start: string; end: string }
  onSelectWindow: (windowId: string) => void
  selectedWindowId: string | null
}

function toMs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getTime()
}

function formatShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function FlareTimeline({
  flareWindows,
  totalDateRange,
  onSelectWindow,
  selectedWindowId,
}: FlareTimelineProps) {
  const rangeStart = toMs(totalDateRange.start)
  const rangeEnd = toMs(totalDateRange.end)
  const totalMs = rangeEnd - rangeStart

  if (totalMs <= 0) return null

  return (
    <div className="space-y-3">
      {/* Timeline bar */}
      <div className="relative h-10 bg-gray-100 rounded-full overflow-hidden">
        {flareWindows.map((fw) => {
          const startMs = toMs(fw.startDate)
          const endMs = fw.endDate ? toMs(fw.endDate) : rangeEnd
          const leftPct = ((startMs - rangeStart) / totalMs) * 100
          const widthPct = ((endMs - startMs) / totalMs) * 100

          const config = FLARE_LEVEL_CONFIG[fw.peakLevel]
          const isSelected = selectedWindowId === fw.id

          return (
            <button
              key={fw.id}
              onClick={() => onSelectWindow(fw.id)}
              className={`absolute top-0 h-full cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-offset-1' : 'hover:brightness-95'
              }`}
              style={{
                left: `${Math.max(leftPct, 0)}%`,
                width: `${Math.max(widthPct, 2)}%`,
                backgroundColor: config.color,
                opacity: isSelected ? 1 : 0.6,
                borderRadius: '4px',
              }}
              title={`${formatShort(fw.startDate)} - ${fw.endDate ? formatShort(fw.endDate) : 'Ongoing'}`}
            />
          )
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between text-xs text-text-muted px-1">
        <span>{formatShort(totalDateRange.start)}</span>
        <span>{formatShort(totalDateRange.end)}</span>
      </div>

      {/* Window labels */}
      <div className="flex flex-wrap gap-2">
        {flareWindows.map((fw) => {
          const config = FLARE_LEVEL_CONFIG[fw.peakLevel]
          const isSelected = selectedWindowId === fw.id
          return (
            <button
              key={fw.id}
              onClick={() => onSelectWindow(fw.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                isSelected ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isSelected ? config.bgColor : 'white',
                borderColor: config.borderColor,
                color: config.color,
              }}
            >
              {formatShort(fw.startDate)} - {fw.endDate ? formatShort(fw.endDate) : 'Ongoing'}
              <span className="ml-1 font-medium">{fw.durationDays}d</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
