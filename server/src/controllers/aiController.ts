import { Request, Response } from 'express'
import OpenAI from 'openai'
import { env } from '../config/env'
import Baseline from '../models/Baseline'
import DailyLog from '../models/DailyLog'
import User from '../models/User'
import UserSchema from '../models/UserSchema'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

interface SchemaMetric {
  id: string
  label: string
  baselineKey?: string
}

/** Capitalize a camelCase key into a human-readable label */
function keyToLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

/** Extract slider metrics from the user's schema, or derive from finalMetrics */
async function getMetricsForUser(userId: string): Promise<SchemaMetric[]> {
  const userSchema = await UserSchema.findOne({ userId })
  if (userSchema?.formSchema) {
    const schema = userSchema.formSchema as { pages?: { questions?: { type: string; id: string; label: string; baselineKey?: string }[] }[] }
    if (schema.pages) {
      const sliders = schema.pages
        .flatMap((p) => p.questions ?? [])
        .filter((q) => q.type === 'slider')
      if (sliders.length > 0) {
        return sliders.map((q) => ({ id: q.id, label: q.label, baselineKey: q.baselineKey }))
      }
    }
  }
  // Fallback: derive from finalMetrics + transientMetrics on UserSchema
  if (userSchema) {
    const allMetrics = [...(userSchema.finalMetrics || []), ...(userSchema.transientMetrics || [])]
    if (allMetrics.length > 0) {
      return allMetrics.map((id) => ({ id, label: keyToLabel(id), baselineKey: id }))
    }
  }
  // No schema at all — return empty (user hasn't completed onboarding)
  return []
}

/** Read a value from a document, checking responses map first then legacy field */
function readValue(doc: Record<string, unknown>, key: string): unknown {
  const responses = doc.responses as Map<string, unknown> | Record<string, unknown> | undefined
  if (responses) {
    // Mongoose Map has .get(), plain objects use bracket access
    const val = typeof (responses as Map<string, unknown>).get === 'function'
      ? (responses as Map<string, unknown>).get(key)
      : (responses as Record<string, unknown>)[key]
    if (val !== undefined) return val
  }
  return doc[key]
}

const SYSTEM_PROMPT = `You are a medical AI assistant helping patients with chronic and rare conditions communicate with their healthcare providers. You analyze self-reported symptom tracking data and produce structured health reports.

You will receive:
1. A patient profile (age, condition, medications, allergies)
2. Their baseline health metrics (their "normal" state)
3. Recent daily symptom logs (last 14 days)
4. A statistical flare analysis (computed by the app's flare detection engine using Z-Score normalization, EWMA smoothing, and composite scoring)

You must produce a JSON response with exactly these three fields:

{
  "clinicianSummary": "(see format below)",
  "plainLanguageSummary": "A warm, clear, patient-friendly explanation of what the data shows. Use simple language. Explain trends in relatable terms. Highlight what's going well and what needs attention. Keep to 3-5 sentences. Do not use medical jargon.",
  "suggestedQuestions": ["An array of 3-5 specific, context-aware questions the patient could ask their doctor at their next visit. Each question should reference specific data points from their logs. Questions should be actionable and help the patient advocate for their care."]
}

CLINICIAN SUMMARY FORMAT — you MUST follow this exact structure. Use the section headers exactly as shown (ALL CAPS). Separate each section with a blank line. Each section should be 1-3 concise sentences with specific numbers. Omit ALERTS if none apply.

PATIENT OVERVIEW
[Age], [condition], diagnosed [duration]. Currently on [medications or "no medications reported"]. Reporting period: [date range of logs].

CURRENT STATUS
[Current flare status and streak]. Composite score trend: [direction]. [1 sentence on overall trajectory].

SYMPTOM TRENDS
[Most affected symptom with numbers vs baseline]. [Second most affected]. [Any improving symptoms].

SLEEP ANALYSIS
[Average sleep hours vs baseline]. [Quality trend]. [Notable pattern if any].

ALERTS
[Only include if health check-in flags were raised — chest pain/weakness, fever/sweats, missed meds. Otherwise omit this section entirely.]

CLINICAL OBSERVATIONS
[1-2 notable patterns worth discussing — e.g., symptom correlations, weekend vs weekday differences, gradual worsening]. [Suggested follow-up actions for the provider to consider.]

Keep the entire summary under 400 words. Use appropriate medical terminology.

Important rules:
- Always include specific numbers from the data (e.g., "pain averaged 6.2/10 vs baseline of 3/10")
- Never make diagnoses or prescribe treatments
- Frame observations as patterns to discuss with a provider
- If health check-in flags are present (chest pain/weakness/confusion, fever/sweats/chills, missed/new medications), prominently highlight them
- Keep the clinician summary under 400 words
- Keep the plain language summary under 150 words
- The tone should be calm, empowering, and medically respectful`

function buildUserMessage(
  user: { profile: { age: number; bloodGroup: string; allergies: string; currentMedications: string } | null },
  baseline: Record<string, unknown>,
  logs: Record<string, unknown>[],
  flareSummary: Record<string, unknown>,
  recentFlareWindows: Record<string, unknown>[],
  recentDailyAnalysis: Record<string, unknown>[],
  metrics: SchemaMetric[],
): string {
  const profile = user.profile
  const lines: string[] = []

  // Patient profile
  lines.push('## Patient Profile')
  if (profile) {
    lines.push(`- Age: ${profile.age}`)
    lines.push(`- Blood Group: ${profile.bloodGroup}`)
    lines.push(`- Allergies: ${profile.allergies || 'None reported'}`)
    lines.push(`- Current Medications: ${profile.currentMedications || 'None reported'}`)
  } else {
    lines.push('- Profile not completed')
  }
  lines.push(`- Primary Condition: ${baseline.primaryCondition}`)
  lines.push(`- Condition Duration: ${baseline.conditionDurationMonths} months`)
  lines.push('')

  // Baseline metrics — dynamic
  lines.push('## Baseline Health Metrics (established ' + baseline.baselineDate + ')')
  for (const m of metrics) {
    const val = readValue(baseline, m.baselineKey ?? m.id)
    lines.push(`- ${m.label}: ${val}/10`)
  }
  const sleepHours = readValue(baseline, 'sleepHours')
  const sleepQuality = readValue(baseline, 'sleepQuality')
  lines.push(`- Usual Sleep: ${sleepHours} hours, Quality: ${sleepQuality}/5`)
  const bedtime = readValue(baseline, 'usualBedtime')
  const wakeTime = readValue(baseline, 'usualWakeTime')
  lines.push(`- Usual Schedule: Bed ${bedtime}, Wake ${wakeTime}`)
  lines.push('')

  // Recent daily logs — dynamic
  lines.push(`## Recent Daily Logs (${logs.length} days)`)
  const sortedLogs = [...logs].sort((a, b) => (a.date as string).localeCompare(b.date as string))
  for (const log of sortedLogs) {
    const symptomStr = metrics
      .map((m) => `${m.label} ${readValue(log, m.id)}`)
      .join(', ')
    const redFlags = log.redFlags as Record<string, boolean> | undefined
    const flags: string[] = []
    if (redFlags?.chestPainWeaknessConfusion) flags.push('Chest pain/weakness/confusion')
    if (redFlags?.feverSweatsChills) flags.push('Fever/sweats/chills')
    if (redFlags?.missedOrNewMedication) flags.push('Missed/new medication')
    const flagStr = flags.length > 0 ? flags.join(', ') : 'None'
    const logSleep = readValue(log, 'sleepHours')
    const logQuality = readValue(log, 'sleepQuality')
    const notes = log.notes as string | undefined
    lines.push(`- ${log.date}: ${symptomStr} | Sleep: ${logSleep}h (Quality: ${logQuality}/5) | Health Check-ins: ${flagStr}${notes ? ` | Notes: ${notes}` : ''}`)
  }
  lines.push('')

  // Flare engine analysis
  lines.push('## Flare Engine Analysis')
  lines.push(`- Current Status: ${flareSummary.currentStatus}`)
  lines.push(`- Current Streak: ${flareSummary.currentStreak} days`)
  lines.push(`- Trend: ${flareSummary.trendDirection}`)
  lines.push(`- Average Composite Score: ${flareSummary.averageCompositeScore}`)
  lines.push(`- Total Flare Windows: ${flareSummary.totalFlareWindows} (${flareSummary.totalFlareDays} flare days, ${flareSummary.severeFlareDays} severe)`)
  lines.push(`- Most Affected Symptom: ${flareSummary.worstSymptom}`)
  lines.push('')

  if (recentFlareWindows.length > 0) {
    lines.push('### Flare Windows')
    for (const fw of recentFlareWindows) {
      lines.push(`- ${fw.startDate} to ${fw.endDate || 'ongoing'}: ${fw.severity} flare, ${fw.durationDays} days, peak score ${fw.peakScore}, dominant symptom: ${fw.dominantSymptom}`)
    }
    lines.push('')
  }

  if (recentDailyAnalysis.length > 0) {
    lines.push('### Recent Daily Composite Scores')
    const recent = recentDailyAnalysis.slice(-7)
    for (const da of recent) {
      const contribs = (da.topContributors as { symptom: string; contribution: number }[])
        .map((c) => `${c.symptom}: ${(c.contribution as number).toFixed(2)}`)
        .join(', ')
      lines.push(`- ${da.date}: Score ${(da.compositeScore as number).toFixed(2)} (${da.flareLevel}) — Top: ${contribs}`)
    }
  }

  return lines.join('\n')
}

const FLARE_EXPLAIN_PROMPT = `You are a compassionate health assistant explaining a detected flare to a patient with a chronic condition. Your goal is to help them genuinely understand what might have triggered this flare — not just describe it.

You will receive:
- The patient's baseline (their "normal day" self-reported ratings, 0-10 scale)
- PRE-FLARE days (the days just before the flare started — look for early warning signs here)
- DURING-FLARE days (self-reported ratings + statistical signals showing which symptoms drove the flare)
- Patient notes from the period (these often contain clues: stress, missed meds, poor sleep, weather, activity changes)

KEY CONCEPTS (for your understanding only — never use these terms in your output):
- "Z-Score": how far above personal normal. z=2 means well outside their usual range.
- "EWMA": smoothed trend. High EWMA = consistently elevated, not just a one-day spike.
- "Contribution %": which symptom drove the overall flare score the most.

YOUR TASK:
Write a short, insightful explanation with two parts:

1. WHAT HAPPENED (1-2 sentences): Briefly describe the flare — which symptoms were most affected and how they compared to the patient's normal. Use their actual /10 ratings.

2. POSSIBLE TRIGGERS (2-3 sentences): This is the most important part. Look at the pre-flare days and notes to suggest 2-3 possible causes. Think like a detective:
   - Did sleep quality or hours drop before the flare started?
   - Did the patient mention stress, activity changes, weather, missed medication, or illness in their notes?
   - Did one symptom start creeping up before others followed?
   - Did a health check-in flag get raised (missed meds, fever, etc.)?
   - Is there a pattern between symptoms (e.g., poor sleep → fatigue → pain cascade)?
   Frame these as possibilities, not diagnoses. Use language like "This may have been connected to...", "One possible factor is...", "It's worth discussing with your doctor whether..."

Respond with JSON: { "explanation": "your explanation here" }

Rules:
- Max 200 words
- Use the patient's actual self-reported ratings (/10), not statistical scores
- Never say "EWMA", "Z-Score", "composite score", or "standard deviation"
- Never diagnose or prescribe — frame insights as patterns worth discussing with their doctor
- If you spot a plausible trigger, say so clearly but gently
- If the notes mention something specific (e.g., "bad week at work", "forgot meds"), connect it to the data
- If there's not enough data to suggest causes, say so honestly rather than making things up
- Tone: warm, insightful, genuinely helpful — like a thoughtful friend who also understands health data`

export async function explainFlareWindow(req: Request, res: Response) {
  const { flareWindow, dailyAnalysis } = req.body

  if (!flareWindow || !dailyAnalysis) {
    res.status(400).json({ error: 'Flare window and daily analysis data are required' })
    return
  }

  const endDate = flareWindow.endDate || new Date().toISOString().slice(0, 10)

  // Compute a date 5 days before the flare start for pre-flare context
  const preFlareDate = new Date(flareWindow.startDate + 'T00:00:00')
  preFlareDate.setDate(preFlareDate.getDate() - 5)
  const preFlareStart = preFlareDate.toISOString().slice(0, 10)

  const [user, baseline, logs, metrics] = await Promise.all([
    User.findById(req.userId).select('-password'),
    Baseline.findOne({ userId: req.userId }),
    DailyLog.find({
      userId: req.userId,
      date: { $gte: preFlareStart, $lte: endDate },
    }).sort({ date: 1 }),
    getMetricsForUser(req.userId!),
  ])

  if (!baseline) {
    res.status(400).json({ error: 'Baseline is required' })
    return
  }

  const baselineObj = baseline.toObject() as unknown as Record<string, unknown>
  const profile = user?.profile
  const lines: string[] = []

  lines.push('## Patient Context')
  lines.push(`- Condition: ${baseline.primaryCondition}`)
  if (profile) {
    lines.push(`- Age: ${profile.age}`)
    lines.push(`- Medications: ${profile.currentMedications || 'None reported'}`)
  }
  lines.push('')

  lines.push('## Baseline ("Normal Day" Ratings)')
  for (const m of metrics) {
    const val = readValue(baselineObj, m.baselineKey ?? m.id)
    lines.push(`- ${m.label}: ${val}/10`)
  }
  lines.push(`- Sleep: ${readValue(baselineObj, 'sleepHours')}h, quality ${readValue(baselineObj, 'sleepQuality')}/5`)
  lines.push('')

  lines.push('## Flare Overview')
  lines.push(`- Period: ${flareWindow.startDate} to ${flareWindow.endDate || 'ongoing'}`)
  lines.push(`- Duration: ${flareWindow.durationDays} days`)
  lines.push(`- Severity reached: ${flareWindow.peakLevel}`)
  if (flareWindow.escalated) {
    lines.push(`- This flare escalated (got significantly worse) on ${flareWindow.escalationDate}`)
  }
  if (flareWindow.triggerNotes?.length > 0) {
    lines.push(`- Patient's own notes: "${flareWindow.triggerNotes.join('"; "')}"`)
  }
  lines.push('')

  // Build a log lookup for actual ratings
  const logByDate: Record<string, typeof logs[0]> = {}
  for (const log of logs) {
    logByDate[log.date] = log
  }

  // Separate pre-flare logs from during-flare logs
  const preFlare = logs.filter(l => l.date < flareWindow.startDate)
  if (preFlare.length > 0) {
    lines.push('## Pre-Flare Days (look for early warning signs here)')
    for (const log of preFlare) {
      const logObj = log.toObject() as unknown as Record<string, unknown>
      lines.push(`### ${log.date}`)
      const symptomStr = metrics
        .map((m) => `${m.label} ${readValue(logObj, m.id)}/10`)
        .join(', ')
      lines.push(`  ${symptomStr}`)
      lines.push(`  Sleep: ${readValue(logObj, 'sleepHours')}h (quality ${readValue(logObj, 'sleepQuality')}/5)`)
      const flags: string[] = []
      if (log.redFlags?.chestPainWeaknessConfusion) flags.push('Chest pain/weakness/confusion')
      if (log.redFlags?.feverSweatsChills) flags.push('Fever/sweats/chills')
      if (log.redFlags?.missedOrNewMedication) flags.push('Missed or new medication')
      if (flags.length > 0) lines.push(`  Health check-in flags: ${flags.join(', ')}`)
      if (log.notes) lines.push(`  Notes: "${log.notes}"`)
      lines.push('')
    }
  }

  lines.push('## During Flare — Day-by-Day')
  lines.push('')
  for (const day of dailyAnalysis) {
    const log = logByDate[day.date]
    lines.push(`### ${day.date} — Severity: ${day.validatedFlareLevel}`)
    if (log) {
      const logObj = log.toObject() as unknown as Record<string, unknown>
      const symptomStr = metrics
        .map((m) => `${m.label} ${readValue(logObj, m.id)}/10`)
        .join(', ')
      lines.push(`  Self-reported: ${symptomStr}`)
      lines.push(`  Sleep: ${readValue(logObj, 'sleepHours')}h (quality ${readValue(logObj, 'sleepQuality')}/5)`)
      const flags: string[] = []
      if (log.redFlags?.chestPainWeaknessConfusion) flags.push('Chest pain/weakness/confusion')
      if (log.redFlags?.feverSweatsChills) flags.push('Fever/sweats/chills')
      if (log.redFlags?.missedOrNewMedication) flags.push('Missed or new medication')
      if (flags.length > 0) lines.push(`  Health check-in flags: ${flags.join(', ')}`)
      if (log.notes) lines.push(`  Notes: "${log.notes}"`)
    }
    // Statistical context: which symptoms drove this day's flare signal
    const topSymptoms = day.contributingSymptoms.slice(0, 3)
    const totalContrib = day.contributingSymptoms.reduce((s: number, c: { contribution: number }) => s + c.contribution, 0)
    const contribSummary = topSymptoms
      .map((c: { label: string; ewma: number; zScore: number; contribution: number }) => {
        const pct = totalContrib > 0 ? Math.round((c.contribution / totalContrib) * 100) : 0
        return `${c.label} (${pct}% of flare signal, z-score: ${c.zScore.toFixed(1)}, smoothed trend: ${c.ewma.toFixed(1)})`
      })
      .join(', ')
    lines.push(`  Flare drivers: ${contribSummary}`)
    lines.push('')
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: FLARE_EXPLAIN_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'No response from AI service' })
      return
    }

    const parsed = JSON.parse(content)
    if (!parsed.explanation) {
      res.status(502).json({ error: 'AI returned an incomplete response' })
      return
    }

    res.json({
      explanation: parsed.explanation,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const error = err as Error & { status?: number }
    if (error.status === 429) {
      res.status(429).json({ error: 'AI service rate limit reached. Please try again in a moment.' })
      return
    }
    console.error('OpenAI error:', error.message)
    res.status(502).json({ error: 'Failed to generate explanation. Please try again.' })
  }
}

export async function generateReport(req: Request, res: Response) {
  const { flareSummary, recentFlareWindows, recentDailyAnalysis } = req.body

  if (!flareSummary || !recentDailyAnalysis) {
    res.status(400).json({ error: 'Flare analysis data is required' })
    return
  }

  const [user, baseline, logs, metrics] = await Promise.all([
    User.findById(req.userId).select('-password'),
    Baseline.findOne({ userId: req.userId }),
    DailyLog.find({ userId: req.userId }).sort({ date: -1 }).limit(14),
    getMetricsForUser(req.userId!),
  ])

  if (!baseline) {
    res.status(400).json({ error: 'Baseline is required before generating a report' })
    return
  }

  if (logs.length < 3) {
    res.status(400).json({ error: 'At least 3 daily logs are required to generate a report' })
    return
  }

  const baselineObj = baseline.toObject() as unknown as Record<string, unknown>
  const logObjs = logs.map((l) => l.toObject() as unknown as Record<string, unknown>)

  const userMessage = buildUserMessage(
    { profile: user?.profile ?? null },
    baselineObj,
    logObjs,
    flareSummary,
    recentFlareWindows || [],
    recentDailyAnalysis,
    metrics,
  )

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'No response from AI service' })
      return
    }

    const parsed = JSON.parse(content)

    if (!parsed.clinicianSummary || !parsed.plainLanguageSummary || !parsed.suggestedQuestions) {
      res.status(502).json({ error: 'AI returned an incomplete response' })
      return
    }

    res.json({
      report: {
        clinicianSummary: parsed.clinicianSummary,
        plainLanguageSummary: parsed.plainLanguageSummary,
        suggestedQuestions: parsed.suggestedQuestions,
        generatedAt: new Date().toISOString(),
        disclaimer: 'This report was generated by AI (GPT-4o-mini) based on self-reported symptom data. It is not a medical diagnosis. Always consult your healthcare provider for medical decisions.',
      },
    })
  } catch (err) {
    const error = err as Error & { status?: number }
    if (error.status === 429) {
      res.status(429).json({ error: 'AI service rate limit reached. Please try again in a moment.' })
      return
    }
    console.error('OpenAI error:', error.message)
    res.status(502).json({ error: 'Failed to generate report. Please try again.' })
  }
}

// ── Scan hand-filled form image ──────────────────────────

export async function scanForm(req: Request, res: Response) {
  const file = (req as Request & { file?: Express.Multer.File }).file
  if (!file) {
    res.status(400).json({ error: 'No image uploaded' })
    return
  }

  // OpenAI Vision only accepts image types
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    res.status(400).json({ error: 'Please upload an image (JPEG, PNG, GIF, or WebP). PDFs are not supported.' })
    return
  }

  // Fetch schema so we know what fields to extract
  const userSchema = await UserSchema.findOne({ userId: req.userId })
  if (!userSchema?.formSchema) {
    res.status(400).json({ error: 'No schema found — complete onboarding first' })
    return
  }

  const schema = userSchema.formSchema as {
    pages?: {
      questions?: { type: string; id: string; label: string; group?: string }[]
    }[]
  }

  // Build a description of expected fields for GPT
  const sliderFields: string[] = []
  const toggleFields: { id: string; label: string; group?: string }[] = []
  const numericFields: { id: string; label: string }[] = []
  const likertFields: { id: string; label: string }[] = []
  const timeFields: { id: string; label: string }[] = []
  const textFields: { id: string; label: string }[] = []

  for (const page of schema.pages ?? []) {
    for (const q of page.questions ?? []) {
      switch (q.type) {
        case 'slider':
          sliderFields.push(`"${q.id}" (${q.label}, 0-10)`)
          break
        case 'toggle':
          toggleFields.push({ id: q.id, label: q.label, group: q.group })
          break
        case 'numeric':
          numericFields.push({ id: q.id, label: q.label })
          break
        case 'likert':
          likertFields.push({ id: q.id, label: q.label })
          break
        case 'time':
          timeFields.push({ id: q.id, label: q.label })
          break
        case 'text':
          textFields.push({ id: q.id, label: q.label })
          break
      }
    }
  }

  const fieldDescriptions = [
    sliderFields.length > 0
      ? `Symptom sliders (0-10 scale, read the circled number): ${sliderFields.join(', ')}`
      : '',
    toggleFields.length > 0
      ? `Checkboxes (true if checked, false otherwise): ${toggleFields.map((t) => `"${t.id}" (${t.label})`).join(', ')}`
      : '',
    numericFields.length > 0
      ? `Numeric fields: ${numericFields.map((n) => `"${n.id}" (${n.label})`).join(', ')}`
      : '',
    likertFields.length > 0
      ? `Likert scale (read circled number): ${likertFields.map((l) => `"${l.id}" (${l.label})`).join(', ')}`
      : '',
    timeFields.length > 0
      ? `Time fields (HH:MM format): ${timeFields.map((t) => `"${t.id}" (${t.label})`).join(', ')}`
      : '',
    textFields.length > 0
      ? `Text/notes fields: ${textFields.map((t) => `"${t.id}" (${t.label})`).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  // Group info for toggle responses
  const groupInfo = toggleFields.some((t) => t.group)
    ? `\nSome toggles belong to groups. Nest grouped toggles: "groupName": { "toggleId": true/false }`
    : ''

  const base64 = file.buffer.toString('base64')
  const mimeType = file.mimetype || 'image/jpeg'

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an OCR assistant for a health tracking app. You are reading a scanned, hand-filled paper form.

Extract structured data from the form image. The form has these fields:
${fieldDescriptions}
${groupInfo}

Additionally extract these standard fields:
- "sleepHours" (number, 0-24)
- "sleepQuality" (number, 1-5, read the circled number)
- "bedtime" (string, HH:MM)
- "wakeTime" (string, HH:MM)
- "notes" (string, any handwritten text in the notes section)
- "redFlags" object with booleans: "chestPainWeaknessConfusion", "feverSweatsChills", "missedOrNewMedication"

Rules:
1. Read circled numbers on scales carefully
2. Checked boxes = true, unchecked = false
3. If a field is blank/unreadable, omit it from the response
4. If the form is completely empty, not a health form, or is gibberish/unreadable, respond with: {"skipped": true, "reason": "description of why"}
5. Otherwise respond with: {"skipped": false, "data": { ...extracted fields }}
6. Put all symptom responses inside a "responses" key within data

Respond ONLY with valid JSON.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
            },
            { type: 'text', text: 'Please extract the health log data from this hand-filled form.' },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.json({ skipped: true, reason: 'No response from AI' })
      return
    }

    const parsed = JSON.parse(content)
    if (parsed.skipped) {
      res.json({ skipped: true, reason: parsed.reason || 'Form appears empty or unreadable' })
      return
    }

    res.json({ skipped: false, data: parsed.data ?? parsed })
  } catch (err) {
    const error = err as Error & { status?: number }
    if (error.status === 429) {
      res.status(429).json({ error: 'AI service rate limit reached. Please try again.' })
      return
    }
    console.error('Form scan error:', error.message)
    res.status(500).json({ error: 'Failed to process form image' })
  }
}

// ── Summarize chart data with AI ─────────────────────────

export async function summarizeChart(req: Request, res: Response) {
  const { chartTitle, chartData } = req.body
  if (!chartTitle || !chartData) {
    res.status(400).json({ error: 'chartTitle and chartData are required' })
    return
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a health data analyst for a patient tracking app. You summarize chart data in plain, empathetic language a patient can understand.

Rules:
1. Write 2-3 short sentences max
2. Highlight the most important trend or pattern
3. If things are improving, acknowledge it positively
4. If things are worsening, be gentle but honest
5. Use simple language, no medical jargon
6. Do not give medical advice — just describe what the data shows`,
        },
        {
          role: 'user',
          content: `Summarize this "${chartTitle}" chart data for the patient:\n${typeof chartData === 'string' ? chartData : JSON.stringify(chartData)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    })

    const summary = completion.choices[0]?.message?.content?.trim() ?? ''
    res.json({ summary })
  } catch (err) {
    const error = err as Error & { status?: number }
    if (error.status === 429) {
      res.status(429).json({ error: 'AI service rate limit reached. Please try again.' })
      return
    }
    res.status(500).json({ error: 'Failed to generate summary' })
  }
}

// ── Clean up speech-to-text transcription ────────────────

export async function cleanNotes(req: Request, res: Response) {
  const { rawText } = req.body
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    res.json({ text: '', skipped: true })
    return
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You clean up speech-to-text transcriptions for a patient health tracking app. The patient is dictating notes about how they feel today.

Rules:
1. Fix grammar, punctuation, and sentence structure so the note reads naturally
2. Keep the medical meaning intact — do not add or remove symptoms
3. Keep it concise — one to three sentences max
4. If the input is complete gibberish, random sounds, or makes absolutely no medical/health sense, respond with exactly: {"text":"","skipped":true}
5. Otherwise respond with: {"text":"the cleaned note","skipped":false}

Respond ONLY with the JSON object, nothing else.`,
        },
        { role: 'user', content: rawText.trim() },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      res.json({ text: rawText.trim(), skipped: false })
      return
    }

    const parsed = JSON.parse(content)
    res.json({ text: parsed.text ?? '', skipped: !!parsed.skipped })
  } catch (err) {
    const error = err as Error & { status?: number }
    if (error.status === 429) {
      res.status(429).json({ error: 'AI service rate limit reached. Please try again.' })
      return
    }
    // On failure, return raw text rather than blocking the user
    res.json({ text: rawText.trim(), skipped: false })
  }
}
