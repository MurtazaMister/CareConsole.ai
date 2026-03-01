import { Request, Response } from 'express'
import OpenAI from 'openai'
import { env } from '../config/env'
import Baseline from '../models/Baseline'
import DailyLog from '../models/DailyLog'
import User from '../models/User'

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a medical AI assistant helping patients with chronic and rare conditions communicate with their healthcare providers. You analyze self-reported symptom tracking data and produce structured health reports.

You will receive:
1. A patient profile (age, condition, medications, allergies)
2. Their baseline health metrics (their "normal" state)
3. Recent daily symptom logs (last 14 days)
4. A statistical flare analysis (computed by the app's flare detection engine using Z-Score normalization, EWMA smoothing, and composite scoring)

You must produce a JSON response with exactly these three fields:

{
  "clinicianSummary": "A structured clinical summary suitable for sharing with a healthcare provider. Include: patient demographics, condition context, reporting period, current flare status, symptom trends with specific numbers, sleep pattern analysis, health check-in alerts if any, and notable observations. Use appropriate medical terminology. Be concise but thorough. Use clear section headers (e.g., PATIENT SUMMARY, SYMPTOM TRENDS, SLEEP ANALYSIS, ALERTS, OBSERVATIONS). Keep under 400 words.",

  "plainLanguageSummary": "A warm, clear, patient-friendly explanation of what the data shows. Use simple language. Explain trends in relatable terms. Highlight what's going well and what needs attention. Keep to 3-5 sentences. Do not use medical jargon.",

  "suggestedQuestions": ["An array of 3-5 specific, context-aware questions the patient could ask their doctor at their next visit. Each question should reference specific data points from their logs. Questions should be actionable and help the patient advocate for their care."]
}

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
  baseline: { primaryCondition: string; conditionDurationMonths: number; baselineDate: string; painLevel: number; fatigueLevel: number; breathingDifficulty: number; functionalLimitation: number; sleepHours: number; sleepQuality: number; usualBedtime: string; usualWakeTime: string },
  logs: { date: string; painLevel: number; fatigueLevel: number; breathingDifficulty: number; functionalLimitation: number; redFlags: { chestPainWeaknessConfusion: boolean; feverSweatsChills: boolean; missedOrNewMedication: boolean }; sleepHours: number; sleepQuality: number; notes: string }[],
  flareSummary: Record<string, unknown>,
  recentFlareWindows: Record<string, unknown>[],
  recentDailyAnalysis: Record<string, unknown>[],
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

  // Baseline metrics
  lines.push('## Baseline Health Metrics (established ' + baseline.baselineDate + ')')
  lines.push(`- Pain Level: ${baseline.painLevel}/10`)
  lines.push(`- Fatigue Level: ${baseline.fatigueLevel}/10`)
  lines.push(`- Breathing Difficulty: ${baseline.breathingDifficulty}/10`)
  lines.push(`- Functional Limitation: ${baseline.functionalLimitation}/10`)
  lines.push(`- Usual Sleep: ${baseline.sleepHours} hours, Quality: ${baseline.sleepQuality}/5`)
  lines.push(`- Usual Schedule: Bed ${baseline.usualBedtime}, Wake ${baseline.usualWakeTime}`)
  lines.push('')

  // Recent daily logs
  lines.push(`## Recent Daily Logs (${logs.length} days)`)
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date))
  for (const log of sortedLogs) {
    const flags: string[] = []
    if (log.redFlags.chestPainWeaknessConfusion) flags.push('Chest pain/weakness/confusion')
    if (log.redFlags.feverSweatsChills) flags.push('Fever/sweats/chills')
    if (log.redFlags.missedOrNewMedication) flags.push('Missed/new medication')
    const flagStr = flags.length > 0 ? flags.join(', ') : 'None'
    lines.push(`- ${log.date}: Pain ${log.painLevel}, Fatigue ${log.fatigueLevel}, Breathing ${log.breathingDifficulty}, Function ${log.functionalLimitation} | Sleep: ${log.sleepHours}h (Quality: ${log.sleepQuality}/5) | Health Check-ins: ${flagStr}${log.notes ? ` | Notes: ${log.notes}` : ''}`)
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

const FLARE_EXPLAIN_PROMPT = `You are a compassionate health assistant explaining a detected flare to a patient with a chronic condition. Your goal is to help them understand what happened in their body during this period — not just list numbers.

You will receive:
- The patient's baseline (their "normal day" self-reported ratings, 0-10 scale)
- Their actual daily self-reported symptom ratings during the flare (0-10 scale)
- Statistical signals from our flare detection engine (explained below)

KEY CONCEPTS (do NOT use these terms in your response — translate them into plain language):
- "Z-Score": how many standard deviations a symptom is above the patient's personal normal. A z-score of 2 means "roughly double their usual variability."
- "EWMA": a smoothed trend line. Unlike a single day's rating, EWMA builds up over consecutive bad days. A high EWMA means the symptom has been consistently elevated, not just a one-day spike.
- "Composite Score": a weighted combination of all 4 symptoms into one overall flare intensity number. Higher = worse overall.
- "Contribution %": how much each symptom contributed to the overall flare score. This tells you which symptom was the primary driver.

YOUR TASK:
Write 3-5 sentences explaining this flare. Be specific and insightful:
- Compare their actual reported ratings to their baseline (e.g., "Your pain ran around 7/10 during this period, well above your usual 3/10")
- Identify the primary driver and explain WHY it matters (e.g., "Fatigue was the biggest factor — it didn't just spike once, it stayed elevated across the entire window, which is what pushed this into a detected flare")
- If symptoms moved together, note the pattern (e.g., "Pain and breathing difficulty rose in tandem")
- If the flare escalated, explain what that means practically
- If patient notes are present, connect them to the data when relevant

Respond with JSON: { "explanation": "your explanation here" }

Rules:
- Max 150 words
- Use the patient's actual self-reported ratings (the /10 numbers), NOT statistical scores
- Never say "EWMA", "Z-Score", "composite score", or "standard deviation" — use plain language like "consistently above your usual", "a sustained pattern", "trending worse over several days"
- Never diagnose or prescribe
- Tone: calm, clear, empowering — like a knowledgeable friend explaining a lab result`

export async function explainFlareWindow(req: Request, res: Response) {
  const { flareWindow, dailyAnalysis } = req.body

  if (!flareWindow || !dailyAnalysis) {
    res.status(400).json({ error: 'Flare window and daily analysis data are required' })
    return
  }

  const endDate = flareWindow.endDate || new Date().toISOString().slice(0, 10)

  const [user, baseline, logs] = await Promise.all([
    User.findById(req.userId).select('-password'),
    Baseline.findOne({ userId: req.userId }),
    DailyLog.find({
      userId: req.userId,
      date: { $gte: flareWindow.startDate, $lte: endDate },
    }).sort({ date: 1 }),
  ])

  if (!baseline) {
    res.status(400).json({ error: 'Baseline is required' })
    return
  }

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
  lines.push(`- Pain: ${baseline.painLevel}/10`)
  lines.push(`- Fatigue: ${baseline.fatigueLevel}/10`)
  lines.push(`- Breathing Difficulty: ${baseline.breathingDifficulty}/10`)
  lines.push(`- Task Limitation: ${baseline.functionalLimitation}/10`)
  lines.push(`- Sleep: ${baseline.sleepHours}h, quality ${baseline.sleepQuality}/5`)
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

  lines.push('## Day-by-Day Detail')
  lines.push('Each day shows: self-reported ratings (what the patient actually felt) + statistical signals (how unusual it was).')
  lines.push('')
  for (const day of dailyAnalysis) {
    const log = logByDate[day.date]
    lines.push(`### ${day.date} — Severity: ${day.validatedFlareLevel}`)
    if (log) {
      lines.push(`  Self-reported: Pain ${log.painLevel}/10, Fatigue ${log.fatigueLevel}/10, Breathing ${log.breathingDifficulty}/10, Task Limitation ${log.functionalLimitation}/10`)
      lines.push(`  Sleep: ${log.sleepHours}h (quality ${log.sleepQuality}/5)`)
      if (log.notes) lines.push(`  Notes: "${log.notes}"`)
    }
    // Statistical context: contribution breakdown
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
      temperature: 0.3,
      max_tokens: 300,
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

  const [user, baseline, logs] = await Promise.all([
    User.findById(req.userId).select('-password'),
    Baseline.findOne({ userId: req.userId }),
    DailyLog.find({ userId: req.userId }).sort({ date: -1 }).limit(14),
  ])

  if (!baseline) {
    res.status(400).json({ error: 'Baseline is required before generating a report' })
    return
  }

  if (logs.length < 3) {
    res.status(400).json({ error: 'At least 3 daily logs are required to generate a report' })
    return
  }

  const userMessage = buildUserMessage(
    { profile: user?.profile ?? null },
    baseline,
    logs,
    flareSummary,
    recentFlareWindows || [],
    recentDailyAnalysis,
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
