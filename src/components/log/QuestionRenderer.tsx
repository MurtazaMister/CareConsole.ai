import type {
  Question,
  SliderQuestion,
  NumericQuestion,
  LikertQuestion,
  TimeQuestion,
  TextQuestion,
} from '../../constants/logFormSchema'
import MiniSlider from '../MiniSlider'
import LikertScale from '../LikertScale'
import TimeInput from '../TimeInput'

interface QuestionRendererProps {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
  baselineValue?: unknown
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  baselineValue,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'slider':
      return <SliderRenderer q={question} value={value as number} onChange={onChange} baselineValue={baselineValue as number | undefined} />
    case 'toggle':
      return <ToggleRenderer label={question.label} value={value as boolean} onChange={onChange} />
    case 'numeric':
      return <NumericRenderer q={question} value={value as number} onChange={onChange} baselineValue={baselineValue as number | undefined} />
    case 'likert':
      return <LikertRenderer q={question} value={value as number} onChange={onChange} baselineValue={baselineValue as number | undefined} />
    case 'time':
      return <TimeRenderer q={question} value={value as string} onChange={onChange} baselineValue={baselineValue as string | undefined} />
    case 'text':
      return <TextRenderer q={question} value={value as string} onChange={onChange} />
  }
}

// ── Slider ───────────────────────────────────────────────

function SliderRenderer({ q, value, onChange, baselineValue }: {
  q: SliderQuestion; value: number; onChange: (v: unknown) => void; baselineValue?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-border px-4 py-3">
      <p className="text-sm font-medium text-text mb-2">{q.question}</p>
      <MiniSlider
        label={q.label}
        icon=""
        showIcon={false}
        value={value}
        onChange={(v) => onChange(v)}
        color="#64748b"
        min={q.min}
        max={q.max}
        trackStyle="intensity"
        baselineValue={baselineValue}
      />
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────

function ToggleRenderer({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: unknown) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`
        w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 border-2
        ${value
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-white hover:border-gray-300'}
      `}
    >
      <span className="text-sm font-medium text-text">{label}</span>
      <div className={`
        w-14 h-8 rounded-full transition-all duration-200 flex items-center px-1
        ${value ? 'bg-primary justify-end' : 'bg-gray-200 justify-start'}
      `}>
        <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
      </div>
    </button>
  )
}

// ── Numeric ──────────────────────────────────────────────

function NumericRenderer({ q, value, onChange, baselineValue }: {
  q: NumericQuestion; value: number; onChange: (v: unknown) => void; baselineValue?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text text-sm">{q.label}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={q.min}
            max={q.max}
            value={value || ''}
            onChange={(e) => onChange(Math.max(q.min, Math.min(q.max, Number(e.target.value))))}
            placeholder={q.placeholder}
            className="w-24 px-3 py-2 rounded-lg border border-border bg-surface text-text text-center font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {q.unit && <span className="text-sm text-text-muted">{q.unit}</span>}
        </div>
      </div>
      {baselineValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-text-muted">
          <span className="w-2 h-2 rounded-full bg-surface-dark inline-block" />
          Baseline: {baselineValue} {q.unit || ''}
        </div>
      )}
    </div>
  )
}

// ── Likert ───────────────────────────────────────────────

function LikertRenderer({ q, value, onChange, baselineValue }: {
  q: LikertQuestion; value: number; onChange: (v: unknown) => void; baselineValue?: number
}) {
  return (
    <LikertScale
      value={value}
      onChange={(v) => onChange(v)}
      baselineValue={baselineValue}
      showIcon={false}
      variant="neutral"
      label={q.label}
      labels={q.labels}
      scale={q.scale}
    />
  )
}

// ── Time ─────────────────────────────────────────────────

function TimeRenderer({ q, value, onChange, baselineValue }: {
  q: TimeQuestion; value: string; onChange: (v: unknown) => void; baselineValue?: string
}) {
  return (
    <TimeInput
      label={q.label}
      icon=""
      value={value}
      onChange={(v) => onChange(v)}
      baselineValue={baselineValue}
      showIcon={false}
      showDropdownArrow
    />
  )
}

// ── Text ─────────────────────────────────────────────────

function TextRenderer({ q, value, onChange }: {
  q: TextQuestion; value: string; onChange: (v: unknown) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5">
      <label className="block text-sm font-medium text-text mb-1">
        {q.question} {!q.required && <span className="text-text-muted font-normal">(optional)</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.placeholder}
        className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
        rows={q.multiline ? 3 : 1}
      />
    </div>
  )
}
