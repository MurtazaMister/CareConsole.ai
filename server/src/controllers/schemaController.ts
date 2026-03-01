import { Request, Response } from 'express'
import OpenAI from 'openai'
import { env } from '../config/env'
import UserSchema from '../models/UserSchema'
import Baseline from '../models/Baseline'
import User from '../models/User'
import DailyLog from '../models/DailyLog'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function getSchema(req: Request, res: Response) {
  const doc = await UserSchema.findOne({ userId: req.userId })
  if (!doc) {
    res.json({ schema: null })
    return
  }
  res.json({ schema: doc.formSchema })
}

const SCHEMA_SYSTEM_PROMPT = `You are a clinical questionnaire designer for a patient health tracking app. You generate personalized daily log form schemas based on a patient's disease, profile, and recent notes.

CRITICAL — PERSONALIZATION FROM PATIENT NOTES:
The patient's recent notes are your most important input for personalization. If the patient mentions ANY specific symptom, injury, body part, or health concern in their notes — you MUST create a slider question to track it. Examples:
- Note says "wrist sprain" → add a "Wrist Pain" slider
- Note says "brain fog" → add a "Cognitive Clarity" slider
- Note says "knee swelling" → add a "Knee Swelling" slider
- Note says "nausea" → add a "Nausea" slider
The notes tell you what THIS patient is actually dealing with RIGHT NOW. Generic disease symptoms alone are not enough — the questionnaire must reflect the patient's lived experience.

OUTPUT FORMAT — you MUST return a valid JSON object matching this exact structure:

{
  "pages": [
    {
      "id": "string",
      "title": "string",
      "subtitle": "string",
      "description": "string (optional)",
      "layout": "individual" | "grouped" (optional, default "individual"),
      "questions": [
        // SLIDER question (for trackable symptoms, 0-10 NRS scale):
        {
          "id": "string (camelCase, unique across all pages)",
          "type": "slider",
          "label": "string (short display name)",
          "question": "string (full question text with TODAY emphasis)",
          "required": true,
          "min": 0,
          "max": 10,
          "color": "string (hex color)",
          "gradient": "string (tailwind gradient classes)",
          "baselineKey": "string (same as id for new metrics)",
          "defaultValue": 0,
          "weight": 0.25  // flare engine weight, 0-1, all slider weights must sum to 1.0
        },
        // TOGGLE question (yes/no health check-ins):
        {
          "id": "string",
          "type": "toggle",
          "label": "string",
          "question": "string",
          "required": false,
          "group": "redFlags"  // nests under redFlags in form data
        },
        // NUMERIC question:
        {
          "id": "string",
          "type": "numeric",
          "label": "string",
          "question": "string",
          "required": true,
          "min": 0,
          "max": 24,
          "unit": "string (optional)",
          "placeholder": "string (optional)",
          "baselineKey": "string (optional)",
          "defaultValue": 0
        },
        // LIKERT question:
        {
          "id": "string",
          "type": "likert",
          "label": "string",
          "question": "string",
          "required": true,
          "scale": 5,
          "labels": { "1": "Very Poor", "2": "Poor", "3": "Fair", "4": "Good", "5": "Very Good" },
          "baselineKey": "string (optional)",
          "defaultValue": 3
        },
        // TIME question:
        {
          "id": "string",
          "type": "time",
          "label": "string",
          "question": "string",
          "required": true,
          "baselineKey": "string (optional)",
          "defaultValue": "22:00"
        },
        // TEXT question:
        {
          "id": "string",
          "type": "text",
          "label": "string",
          "question": "string",
          "required": false,
          "placeholder": "string (optional)",
          "multiline": true
        }
      ]
    }
  ]
}

RULES:
1. Create 2-4 pages with 2-6 questions per page
2. The FIRST page MUST contain slider questions (core trackable symptoms). Include 3-6 slider questions that are clinically relevant to the patient's specific condition
3. Include a health check-in page with toggle questions (grouped layout, group="redFlags") — 2-4 toggles for red-flag symptoms specific to this condition
4. Include a sleep page with: numeric hours, likert quality, time bedtime, time wakeTime — use the EXACT ids: sleepHours, sleepQuality, bedtime, wakeTime with baselineKeys: sleepHours, sleepQuality, usualBedtime, usualWakeTime
5. The last page should include a text question for notes (id="notes" is handled separately, so don't include it)
6. All slider question weights MUST sum to exactly 1.0
7. Use these hex colors for sliders (pick from this palette): #ef4444, #f59e0b, #06b6d4, #6366f1, #8b5cf6, #ec4899, #10b981, #f97316
8. Use matching tailwind gradients: from-red-400 to-rose-500, from-amber-400 to-orange-500, from-cyan-400 to-teal-500, from-indigo-400 to-blue-500, from-violet-400 to-purple-500, from-pink-400 to-rose-500, from-emerald-400 to-green-500, from-orange-400 to-amber-500
9. Question ids must be camelCase and unique
10. For slider baselineKey, use the same value as the id
11. Make questions specific to the patient's condition — don't use generic symptom names when disease-specific ones would be more meaningful
12. Keep question text concise and patient-friendly`

export async function generateSchema(req: Request, res: Response) {
  const [baseline, user, recentLogs] = await Promise.all([
    Baseline.findOne({ userId: req.userId }),
    User.findById(req.userId).select('-password'),
    DailyLog.find({ userId: req.userId }).sort({ date: -1 }).limit(5),
  ])

  if (!baseline) {
    res.status(400).json({ error: 'Baseline is required before generating a schema' })
    return
  }

  const disease = baseline.primaryCondition
  const profile = user?.profile

  // Collect recent notes for context
  const recentNotes = recentLogs
    .filter((l) => l.notes && l.notes.trim())
    .map((l) => l.notes)
    .join('; ')

  const userMessage = [
    `## Patient Information`,
    `- Primary Condition: ${disease}`,
    `- Condition Duration: ${baseline.conditionDurationMonths} months`,
    profile ? `- Age: ${profile.age}` : '',
    profile?.allergies ? `- Allergies: ${profile.allergies}` : '',
    profile?.currentMedications ? `- Current Medications: ${profile.currentMedications}` : '',
    recentNotes ? `\n## Recent Patient Notes\n${recentNotes}\n\nYou MUST include slider questions that directly address the symptoms, injuries, and concerns mentioned in these notes. Do NOT ignore them.` : '',
    `\nGenerate a personalized daily log form schema for this patient. Combine clinically relevant symptoms for ${disease} WITH any specific concerns from the patient's notes above.`,
  ].filter(Boolean).join('\n')

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SCHEMA_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2000,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'No response from AI service' })
      return
    }

    const parsed = JSON.parse(content)

    // Basic validation
    if (!parsed.pages || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      res.status(502).json({ error: 'AI returned an invalid schema' })
      return
    }

    // Validate that slider weights sum to ~1.0
    const sliders = parsed.pages
      .flatMap((p: { questions: { type: string; weight?: number }[] }) => p.questions)
      .filter((q: { type: string }) => q.type === 'slider')

    if (sliders.length === 0) {
      res.status(502).json({ error: 'AI schema must include at least one slider question' })
      return
    }

    const weightSum = sliders.reduce((s: number, q: { weight?: number }) => s + (q.weight ?? 0), 0)
    // Normalize weights if they don't sum to 1.0
    if (Math.abs(weightSum - 1.0) > 0.01) {
      for (const slider of sliders) {
        slider.weight = (slider.weight ?? (1 / sliders.length)) / weightSum
      }
    }

    // Save to DB
    const doc = await UserSchema.findOneAndUpdate(
      { userId: req.userId },
      {
        userId: req.userId,
        formSchema: parsed,
        generatedAt: new Date(),
        context: {
          disease,
          notes: recentNotes.slice(0, 500),
        },
      },
      { upsert: true, new: true },
    )

    res.json({ schema: doc.formSchema })
  } catch (err) {
    const error = err as Error & { status?: number }
    if (error.status === 429) {
      res.status(429).json({ error: 'AI service rate limit reached. Please try again in a moment.' })
      return
    }
    console.error('OpenAI schema generation error:', error.message)
    res.status(502).json({ error: 'Failed to generate schema. Please try again.' })
  }
}
