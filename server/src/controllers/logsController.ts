import { Request, Response } from 'express'
import DailyLog from '../models/DailyLog'
import Baseline from '../models/Baseline'
import UserSchema from '../models/UserSchema'
import { validateDateString, validateTimeString } from '../middleware/validate'
import { calculateDeviation, calculateFlareRisk } from '../utils/flareLogic'
import {
  extractSymptomsFromNote,
  processTransientCandidates,
  processTombstones,
} from '../utils/transientDetection'

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

export async function getLogs(req: Request, res: Response) {
  const logs = await DailyLog.find({ userId: req.userId }).sort({ date: -1 })
  res.json({ logs })
}

export async function getLogByDate(req: Request, res: Response) {
  const date = req.params.date as string
  if (!validateDateString(date)) {
    res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' })
    return
  }

  const log = await DailyLog.findOne({ userId: req.userId, date })
  if (!log) {
    res.status(404).json({ error: 'No log found for this date' })
    return
  }
  res.json({ log })
}

export async function createOrUpdateLog(req: Request, res: Response) {
  const {
    date,
    redFlags,
    sleepHours,
    sleepQuality,
    bedtime,
    wakeTime,
    notes,
    responses,
  } = req.body

  // Validate date
  if (!date || !validateDateString(date)) {
    res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' })
    return
  }
  if (date > getTodayDateString()) {
    res.status(400).json({ error: 'Cannot log for a future date' })
    return
  }

  // Fetch baseline + schema in parallel
  const [baseline, userSchema] = await Promise.all([
    Baseline.findOne({ userId: req.userId }),
    UserSchema.findOne({ userId: req.userId }),
  ])

  if (!baseline) {
    res.status(400).json({ error: 'You must set up your baseline before logging' })
    return
  }
  if (date < baseline.baselineDate) {
    res.status(400).json({ error: 'Cannot log before your baseline date' })
    return
  }

  // Get active metrics from schema
  const finalMetrics = userSchema?.finalMetrics || []
  const transientMetrics = userSchema?.transientMetrics || []
  const tombstoneMetrics = userSchema?.tombstoneMetrics || []
  const activeMetrics = [...finalMetrics, ...transientMetrics]

  // Validate symptom responses dynamically
  if (responses && typeof responses === 'object') {
    for (const key of activeMetrics) {
      const val = responses[key]
      if (val !== undefined && (typeof val !== 'number' || val < 0 || val > 10)) {
        res.status(400).json({ error: `${key} must be between 0 and 10` })
        return
      }
    }
  }

  // Validate red flags
  if (!redFlags || typeof redFlags !== 'object') {
    res.status(400).json({ error: 'Red flags are required' })
    return
  }

  // Validate sleep
  if (typeof sleepHours !== 'number' || sleepHours < 0 || sleepHours > 24) {
    res.status(400).json({ error: 'Sleep hours must be between 0 and 24' })
    return
  }
  if (typeof sleepQuality !== 'number' || sleepQuality < 1 || sleepQuality > 5) {
    res.status(400).json({ error: 'Sleep quality must be between 1 and 5' })
    return
  }
  if (!bedtime || !validateTimeString(bedtime)) {
    res.status(400).json({ error: 'Invalid bedtime (HH:MM)' })
    return
  }
  if (!wakeTime || !validateTimeString(wakeTime)) {
    res.status(400).json({ error: 'Invalid wake time (HH:MM)' })
    return
  }

  // Validate notes
  if (notes && typeof notes !== 'string') {
    res.status(400).json({ error: 'Notes must be a string' })
    return
  }

  // Compute deviation dynamically
  const logResponses = responses && typeof responses === 'object' ? responses : {}
  const { perMetric, total } = calculateDeviation(
    logResponses,
    baseline.responses,
    activeMetrics,
  )
  const flareRiskLevel = calculateFlareRisk(total, perMetric, redFlags, activeMetrics.length)

  const log = await DailyLog.findOneAndUpdate(
    { userId: req.userId, date },
    {
      userId: req.userId,
      date,
      finalMetrics,
      transientMetrics,
      tombstoneMetrics,
      redFlags: {
        chestPainWeaknessConfusion: !!redFlags.chestPainWeaknessConfusion,
        feverSweatsChills: !!redFlags.feverSweatsChills,
        missedOrNewMedication: !!redFlags.missedOrNewMedication,
      },
      sleepHours,
      sleepQuality,
      bedtime,
      wakeTime,
      notes: notes || '',
      responses: logResponses,
      deviationScore: total,
      flareRiskLevel,
    },
    { upsert: true, new: true, runValidators: true },
  )

  // Post-save: transient detection from notes (async, non-blocking for response)
  if (notes && typeof notes === 'string' && notes.trim().length >= 10 && userSchema) {
    const disease = baseline.primaryCondition
    const existingMetrics = [...finalMetrics, ...transientMetrics, ...tombstoneMetrics]

    // Run transient detection asynchronously — don't block the response
    setImmediate(async () => {
      try {
        const extracted = await extractSymptomsFromNote(notes, disease, existingMetrics)
        if (extracted.length > 0) {
          await processTransientCandidates(req.userId!, date, extracted)
        }
        await processTombstones(req.userId!)
      } catch (err) {
        console.error('Transient detection error:', (err as Error).message)
      }
    })
  }

  res.json({ log })
}
