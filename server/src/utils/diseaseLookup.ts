import OpenAI from 'openai'
import { env } from '../config/env'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export interface DiseaseLookupResult {
  known: boolean
  symptoms: string[]
  labels: Record<string, string>
}

const LOOKUP_PROMPT = `You are a clinical expert. Given a disease or condition name, return the 4-6 most clinically relevant trackable symptoms that a patient would self-report daily on a 0-10 severity scale.

Return valid JSON with exactly this structure:
{
  "known": true/false,
  "symptoms": ["camelCase symptom keys"],
  "labels": { "camelCaseKey": "Human-Readable Label" }
}

Rules:
- Use camelCase for symptom keys (e.g., "jointPain", "muscleFatigue", "skinRash")
- Labels should be short (1-3 words), patient-friendly
- Pick symptoms that are: (a) commonly self-reportable, (b) vary day-to-day, (c) clinically meaningful for that condition
- If you genuinely don't recognize the condition, set known=false and return empty arrays
- Always include "fatigue" if it's relevant to the condition
- Focus on the PRIMARY symptoms that distinguish this disease
- Do NOT include generic symptoms like "overall health" — be specific to the condition`

export async function lookupDiseaseSymptoms(disease: string): Promise<DiseaseLookupResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: LOOKUP_PROMPT },
        { role: 'user', content: `Disease: ${disease}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return { known: false, symptoms: [], labels: {} }
    }

    const parsed = JSON.parse(content)
    if (!parsed.symptoms || !Array.isArray(parsed.symptoms)) {
      return { known: false, symptoms: [], labels: {} }
    }

    return {
      known: parsed.known !== false,
      symptoms: parsed.symptoms,
      labels: parsed.labels || {},
    }
  } catch (err) {
    console.error('Disease lookup error:', (err as Error).message)
    return { known: false, symptoms: [], labels: {} }
  }
}
