import OpenAI from 'openai'
import { env } from '../config/env'
import UserSchema from '../models/UserSchema'
import DailyLog from '../models/DailyLog'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// ── Types ──────────────────────────────────────────────────

interface ExtractedSymptom {
  key: string
  label: string
}

interface SchemaPage {
  id: string
  title: string
  subtitle: string
  description?: string
  layout?: string
  questions: SchemaQuestion[]
}

interface SchemaQuestion {
  id: string
  type: string
  label: string
  question: string
  required: boolean
  min?: number
  max?: number
  color?: string
  gradient?: string
  baselineKey?: string
  defaultValue?: unknown
  weight?: number
  group?: string
  [key: string]: unknown
}

interface FormSchema {
  pages: SchemaPage[]
}

// ── Color palette for new sliders ──────────────────────────

const SLIDER_COLORS = [
  { color: '#ef4444', gradient: 'from-red-400 to-rose-500' },
  { color: '#f59e0b', gradient: 'from-amber-400 to-orange-500' },
  { color: '#06b6d4', gradient: 'from-cyan-400 to-teal-500' },
  { color: '#6366f1', gradient: 'from-indigo-400 to-blue-500' },
  { color: '#8b5cf6', gradient: 'from-violet-400 to-purple-500' },
  { color: '#ec4899', gradient: 'from-pink-400 to-rose-500' },
  { color: '#10b981', gradient: 'from-emerald-400 to-green-500' },
  { color: '#f97316', gradient: 'from-orange-400 to-amber-500' },
]

function pickColor(existingCount: number) {
  return SLIDER_COLORS[existingCount % SLIDER_COLORS.length]
}

// ── Symptom Extraction from Notes ──────────────────────────

const EXTRACTION_PROMPT = `You are a medical NLP system. Extract specific physical symptoms mentioned in the patient's notes that are NOT already being tracked.

Already tracked symptoms: {existingMetrics}
Patient's condition: {disease}

Return valid JSON:
{
  "symptoms": [
    { "key": "camelCaseKey", "label": "Human Label" }
  ]
}

Rules:
- Only extract concrete, trackable symptoms (e.g., "wrist pain", "brain fog", "nausea")
- Do NOT extract: emotions, activities, medication names, or vague complaints
- Use camelCase for keys (e.g., "wristPain", "brainFog")
- Labels should be short (1-3 words)
- If no new symptoms are mentioned, return empty array
- Do NOT include symptoms already in the tracked list`

export async function extractSymptomsFromNote(
  note: string,
  disease: string,
  existingMetrics: string[],
): Promise<ExtractedSymptom[]> {
  if (!note || note.trim().length < 10) return []

  try {
    const prompt = EXTRACTION_PROMPT
      .replace('{existingMetrics}', existingMetrics.join(', ') || 'none')
      .replace('{disease}', disease)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Patient note: "${note}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    if (!parsed.symptoms || !Array.isArray(parsed.symptoms)) return []

    return parsed.symptoms.filter(
      (s: ExtractedSymptom) => s.key && s.label && !existingMetrics.includes(s.key),
    )
  } catch (err) {
    console.error('Symptom extraction error:', (err as Error).message)
    return []
  }
}

// ── Schema Modification Helpers ────────────────────────────

export function addSliderToSchema(schema: FormSchema, key: string, label: string): FormSchema {
  const symptomsPage = schema.pages.find((p) => p.id === 'symptoms')
  if (!symptomsPage) return schema

  const existingSliders = symptomsPage.questions.filter((q) => q.type === 'slider')
  const colorInfo = pickColor(existingSliders.length)

  const newSlider: SchemaQuestion = {
    id: key,
    type: 'slider',
    label,
    question: `How would you rate your ${label.toLowerCase()} TODAY?`,
    required: true,
    min: 0,
    max: 10,
    color: colorInfo.color,
    gradient: colorInfo.gradient,
    baselineKey: key,
    defaultValue: 0,
    weight: 0, // will be redistributed
  }

  symptomsPage.questions.push(newSlider)
  return redistributeWeights(schema)
}

export function removeSliderFromSchema(schema: FormSchema, key: string): FormSchema {
  for (const page of schema.pages) {
    page.questions = page.questions.filter((q) => q.id !== key)
  }
  return redistributeWeights(schema)
}

export function redistributeWeights(schema: FormSchema): FormSchema {
  const allSliders = schema.pages
    .flatMap((p) => p.questions)
    .filter((q) => q.type === 'slider')

  if (allSliders.length === 0) return schema

  const weight = +(1 / allSliders.length).toFixed(4)
  for (const slider of allSliders) {
    slider.weight = weight
  }
  // Adjust last slider to ensure exact sum of 1.0
  const totalAssigned = weight * (allSliders.length - 1)
  allSliders[allSliders.length - 1].weight = +(1 - totalAssigned).toFixed(4)

  return schema
}

// ── Transient Candidate Processing ─────────────────────────

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export interface TransientResult {
  promoted: { key: string; label: string }[]
  tombstoned: string[]
  resurrected: { key: string; label: string }[]
  schemaUpdated: boolean
}

export async function processTransientCandidates(
  userId: string,
  currentDate: string,
  extractedSymptoms: ExtractedSymptom[],
): Promise<TransientResult> {
  const result: TransientResult = {
    promoted: [],
    tombstoned: [],
    resurrected: [],
    schemaUpdated: false,
  }

  if (extractedSymptoms.length === 0) return result

  const userSchema = await UserSchema.findOne({ userId })
  if (!userSchema) return result

  const schema = userSchema.formSchema as FormSchema
  const yesterday = getYesterday(currentDate)

  for (const symptom of extractedSymptoms) {
    // Check for resurrection from tombstone
    if (userSchema.tombstoneMetrics.includes(symptom.key)) {
      userSchema.tombstoneMetrics = userSchema.tombstoneMetrics.filter((k) => k !== symptom.key)
      userSchema.transientMetrics.push(symptom.key)
      addSliderToSchema(schema, symptom.key, symptom.label)
      result.resurrected.push(symptom)
      result.schemaUpdated = true
      continue
    }

    // Skip if already tracked
    if (
      userSchema.finalMetrics.includes(symptom.key) ||
      userSchema.transientMetrics.includes(symptom.key)
    ) {
      continue
    }

    // Track as candidate
    const candidates = userSchema.transientCandidates
    const existing = candidates.get(symptom.key)

    if (existing) {
      if (existing.lastSeen === yesterday || existing.lastSeen === currentDate) {
        existing.count += 1
        existing.lastSeen = currentDate
      } else {
        // Non-consecutive — reset
        existing.count = 1
        existing.lastSeen = currentDate
      }
      candidates.set(symptom.key, existing)
    } else {
      candidates.set(symptom.key, {
        count: 1,
        firstSeen: currentDate,
        lastSeen: currentDate,
        label: symptom.label,
      })
    }

    // Check for promotion (3 consecutive days)
    const candidate = candidates.get(symptom.key)!
    if (candidate.count >= 3) {
      userSchema.transientMetrics.push(symptom.key)
      addSliderToSchema(schema, symptom.key, candidate.label)
      candidates.delete(symptom.key)
      result.promoted.push({ key: symptom.key, label: candidate.label })
      result.schemaUpdated = true
    }
  }

  if (result.schemaUpdated || extractedSymptoms.length > 0) {
    userSchema.formSchema = schema
    userSchema.markModified('formSchema')
    userSchema.markModified('transientCandidates')
    await userSchema.save()
  }

  return result
}

// ── Tombstone Processing ───────────────────────────────────

/** Read a numeric value from a Mongoose Map or plain object */
function readResponseValue(responses: unknown, key: string): number {
  if (!responses) return 0
  const map = responses as Map<string, unknown> | Record<string, unknown>
  const val = typeof (map as Map<string, unknown>).get === 'function'
    ? (map as Map<string, unknown>).get(key)
    : (map as Record<string, unknown>)[key]
  return typeof val === 'number' ? val : 0
}

export async function processTombstones(
  userId: string,
): Promise<string[]> {
  const userSchema = await UserSchema.findOne({ userId })
  if (!userSchema || userSchema.transientMetrics.length === 0) return []

  // Get last 7 logs
  const recentLogs = await DailyLog.find({ userId })
    .sort({ date: -1 })
    .limit(7)

  if (recentLogs.length < 7) return [] // Need at least 7 days of data

  const tombstoned: string[] = []

  for (const metricKey of [...userSchema.transientMetrics]) {
    const allZero = recentLogs.every((log) => {
      return readResponseValue(log.responses, metricKey) === 0
    })

    if (allZero) {
      userSchema.transientMetrics = userSchema.transientMetrics.filter((k) => k !== metricKey)
      userSchema.tombstoneMetrics.push(metricKey)
      removeSliderFromSchema(userSchema.formSchema as FormSchema, metricKey)
      tombstoned.push(metricKey)
    }
  }

  if (tombstoned.length > 0) {
    userSchema.markModified('formSchema')
    await userSchema.save()
  }

  return tombstoned
}
