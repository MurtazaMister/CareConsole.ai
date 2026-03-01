import { Request, Response } from 'express'
import DailyLog from '../models/DailyLog'
import Baseline from '../models/Baseline'
import { validateDateString, validateTimeString } from '../middleware/validate'
import { calculateDeviation, calculateFlareRisk } from '../utils/flareLogic'

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
    painLevel,
    fatigueLevel,
    breathingDifficulty,
    functionalLimitation,
    redFlags,
    sleepHours,
    sleepQuality,
    bedtime,
    wakeTime,
    notes,
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

  // Fetch baseline (required)
  const baseline = await Baseline.findOne({ userId: req.userId })
  if (!baseline) {
    res.status(400).json({ error: 'You must set up your baseline before logging' })
    return
  }
  if (date < baseline.baselineDate) {
    res.status(400).json({ error: 'Cannot log before your baseline date' })
    return
  }

  // Validate symptoms (0-10)
  for (const [key, val] of Object.entries({ painLevel, fatigueLevel, breathingDifficulty, functionalLimitation })) {
    if (typeof val !== 'number' || val < 0 || val > 10) {
      res.status(400).json({ error: `${key} must be between 0 and 10` })
      return
    }
  }

  // Validate red flags
  if (!redFlags || typeof redFlags !== 'object') {
    res.status(400).json({ error: 'Red flags are required' })
    return
  }

  // Validate sleep
  if (typeof sleepHours !== 'number' || sleepHours < 3 || sleepHours > 12) {
    res.status(400).json({ error: 'Sleep hours must be between 3 and 12' })
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
  if (notes && typeof notes === 'string' && notes.length > 150) {
    res.status(400).json({ error: 'Notes must be 150 characters or less' })
    return
  }

  // Compute deviation and flare risk server-side
  const logSymptoms = { painLevel, fatigueLevel, breathingDifficulty, functionalLimitation }
  const baselineSymptoms = {
    painLevel: baseline.painLevel,
    fatigueLevel: baseline.fatigueLevel,
    breathingDifficulty: baseline.breathingDifficulty,
    functionalLimitation: baseline.functionalLimitation,
  }
  const { perMetric, total } = calculateDeviation(logSymptoms, baselineSymptoms)
  const flareRiskLevel = calculateFlareRisk(total, perMetric, redFlags)

  const log = await DailyLog.findOneAndUpdate(
    { userId: req.userId, date },
    {
      userId: req.userId,
      date,
      painLevel,
      fatigueLevel,
      breathingDifficulty,
      functionalLimitation,
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
      deviationScore: total,
      flareRiskLevel,
    },
    { upsert: true, new: true, runValidators: true },
  )

  res.json({ log })
}
