// ── Question Types ───────────────────────────────────────

interface QuestionBase {
  id: string
  label: string
  question: string
  required: boolean
  baselineKey?: string   // key in BaselineProfile to compare against
  defaultValue?: unknown // fallback when no baseline value
}

export interface SliderQuestion extends QuestionBase {
  type: 'slider'
  min: number
  max: number
  step?: number
  color: string
  gradient: string
}

export interface ToggleQuestion extends QuestionBase {
  type: 'toggle'
  group?: string // nests value under form[group][id]
}

export interface NumericQuestion extends QuestionBase {
  type: 'numeric'
  min: number
  max: number
  unit?: string
  placeholder?: string
}

export interface LikertQuestion extends QuestionBase {
  type: 'likert'
  scale: number
  labels: Record<number, string>
}

export interface TimeQuestion extends QuestionBase {
  type: 'time'
}

export interface TextQuestion extends QuestionBase {
  type: 'text'
  placeholder?: string
  multiline?: boolean
}

export type Question =
  | SliderQuestion
  | ToggleQuestion
  | NumericQuestion
  | LikertQuestion
  | TimeQuestion
  | TextQuestion

// ── Page & Schema ────────────────────────────────────────

export interface FormPage {
  id: string
  title: string
  subtitle: string
  description?: string          // extra text shown below title (e.g. "Have you experienced any of the following?")
  layout?: 'individual' | 'grouped'  // individual = each question in its own card, grouped = all in one card
  questions: Question[]
}

export interface LogFormSchema {
  pages: FormPage[]
}

// ── Static Schema (current question set) ─────────────────
//
// This object is the single source of truth for the daily log form.
// In the future, an AI model returns a personalized schema per patient.
// The rest of the app renders from this object — no hardcoded questions.

export const LOG_FORM_SCHEMA: LogFormSchema = {
  pages: [
    // ── Page 1: Core Symptoms ──────────────────────────────
    {
      id: 'symptoms',
      title: 'Rate your core symptoms',
      subtitle: 'Takes 30 seconds',
      questions: [
        {
          id: 'painLevel',
          type: 'slider',
          label: 'Body Pain',
          question: 'What is your overall body pain TODAY?',
          required: true,
          min: 0,
          max: 10,
          color: '#ef4444',
          gradient: 'from-red-400 to-rose-500',
          baselineKey: 'painLevel',
          defaultValue: 0,
        },
        {
          id: 'fatigueLevel',
          type: 'slider',
          label: 'Fatigue',
          question: 'How fatigued or weak do you feel TODAY?',
          required: true,
          min: 0,
          max: 10,
          color: '#f59e0b',
          gradient: 'from-amber-400 to-orange-500',
          baselineKey: 'fatigueLevel',
          defaultValue: 0,
        },
        {
          id: 'breathingDifficulty',
          type: 'slider',
          label: 'Breathing',
          question: 'How much difficulty are you having breathing TODAY?',
          required: true,
          min: 0,
          max: 10,
          color: '#06b6d4',
          gradient: 'from-cyan-400 to-teal-500',
          baselineKey: 'breathingDifficulty',
          defaultValue: 0,
        },
        {
          id: 'functionalLimitation',
          type: 'slider',
          label: 'Task Limitation',
          question: 'How much are your symptoms preventing you from doing normal tasks TODAY?',
          required: true,
          min: 0,
          max: 10,
          color: '#6366f1',
          gradient: 'from-indigo-400 to-blue-500',
          baselineKey: 'functionalLimitation',
          defaultValue: 0,
        },
      ],
    },

    // ── Page 2: Health Check-in ─────────────────────────────
    {
      id: 'health-checks',
      title: 'Health Check-in',
      subtitle: 'Quick yes/no questions',
      description: 'Have you experienced any of the following?',
      layout: 'grouped',
      questions: [
        {
          id: 'chestPainWeaknessConfusion',
          type: 'toggle',
          label: 'Sudden chest pain, severe weakness, or confusion?',
          question: 'Sudden chest pain, severe weakness, or confusion?',
          required: false,
          group: 'redFlags',
        },
        {
          id: 'feverSweatsChills',
          type: 'toggle',
          label: 'New fever, sweats, or chills?',
          question: 'New fever, sweats, or chills?',
          required: false,
          group: 'redFlags',
        },
        {
          id: 'missedOrNewMedication',
          type: 'toggle',
          label: 'Missed any medications or started a new one?',
          question: 'Missed any medications or started a new one?',
          required: false,
          group: 'redFlags',
        },
      ],
    },

    // ── Page 3: Sleep ──────────────────────────────────────
    {
      id: 'sleep',
      title: 'Sleep',
      subtitle: 'How did you sleep?',
      questions: [
        {
          id: 'sleepHours',
          type: 'numeric',
          label: 'Hours Slept',
          question: 'How many hours did you sleep?',
          required: true,
          min: 0,
          max: 24,
          unit: 'hours',
          placeholder: '7',
          baselineKey: 'sleepHours',
          defaultValue: 7,
        },
        {
          id: 'sleepQuality',
          type: 'likert',
          label: 'Sleep Quality',
          question: 'How was your sleep quality?',
          required: true,
          scale: 5,
          labels: {
            1: 'Very Poor',
            2: 'Poor',
            3: 'Fair',
            4: 'Good',
            5: 'Very Good',
          },
          baselineKey: 'sleepQuality',
          defaultValue: 3,
        },
        {
          id: 'bedtime',
          type: 'time',
          label: 'Bedtime',
          question: 'What time did you go to bed?',
          required: true,
          baselineKey: 'usualBedtime',
          defaultValue: '22:00',
        },
        {
          id: 'wakeTime',
          type: 'time',
          label: 'Wake Time',
          question: 'What time did you wake up?',
          required: true,
          baselineKey: 'usualWakeTime',
          defaultValue: '06:00',
        },
      ],
    },
  ],
}

// ── Form Value Helpers ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormValues = Record<string, any>

/** Read a value from the form state, respecting toggle groups */
export function getFormValue(form: FormValues, q: Question): unknown {
  if (q.type === 'toggle' && q.group) {
    return form[q.group]?.[q.id]
  }
  return form[q.id]
}

/** Return a new form state with one value updated */
export function setFormValue(form: FormValues, q: Question, value: unknown): FormValues {
  if (q.type === 'toggle' && q.group) {
    return {
      ...form,
      [q.group]: { ...form[q.group], [q.id]: value },
    }
  }
  return { ...form, [q.id]: value }
}

/** Build initial form values from the schema + optional baseline */
export function createFormDefaults(
  schema: LogFormSchema,
  baseline?: FormValues,
): FormValues {
  const form: FormValues = { notes: '' }

  for (const page of schema.pages) {
    for (const q of page.questions) {
      const baseVal = q.baselineKey && baseline ? baseline[q.baselineKey] : undefined
      const fallback = q.defaultValue

      let val: unknown
      switch (q.type) {
        case 'slider':
          val = baseVal ?? fallback ?? 0
          break
        case 'toggle':
          val = false
          break
        case 'numeric':
          val = baseVal ?? fallback ?? 0
          break
        case 'likert':
          val = baseVal ?? fallback ?? Math.ceil(q.scale / 2)
          break
        case 'time':
          val = baseVal ?? fallback ?? '22:00'
          break
        case 'text':
          val = ''
          break
      }

      if (q.type === 'toggle' && q.group) {
        if (!form[q.group]) form[q.group] = {}
        form[q.group][q.id] = val
      } else {
        form[q.id] = val
      }
    }
  }

  return form
}

/** Load form values from an existing log entry */
export function loadFormFromLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log: Record<string, any>,
  schema: LogFormSchema,
): FormValues {
  const form: FormValues = { notes: log.notes ?? '' }

  for (const page of schema.pages) {
    for (const q of page.questions) {
      if (q.type === 'toggle' && q.group) {
        if (!form[q.group]) form[q.group] = {}
        form[q.group][q.id] = log[q.group]?.[q.id] ?? false
      } else {
        form[q.id] = log[q.id]
      }
    }
  }

  return form
}

// ── Derived helpers for other parts of the app ───────────

/** Get all slider questions (for charts, deviation, etc.) */
export function getSliderQuestions(schema: LogFormSchema): SliderQuestion[] {
  return schema.pages
    .flatMap((p) => p.questions)
    .filter((q): q is SliderQuestion => q.type === 'slider')
}

/** Get all toggle questions (for health check summaries) */
export function getToggleQuestions(schema: LogFormSchema): ToggleQuestion[] {
  return schema.pages
    .flatMap((p) => p.questions)
    .filter((q): q is ToggleQuestion => q.type === 'toggle')
}
