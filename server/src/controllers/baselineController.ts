import { Request, Response } from 'express'
import Baseline from '../models/Baseline'
import { validateDateString, validateTimeString } from '../middleware/validate'

export async function getBaseline(req: Request, res: Response) {
  const baseline = await Baseline.findOne({ userId: req.userId })
  if (!baseline) {
    res.status(404).json({ error: 'No baseline found' })
    return
  }
  res.json({ baseline })
}

export async function upsertBaseline(req: Request, res: Response) {
  const {
    primaryCondition,
    conditionDurationMonths,
    baselineDate,
    painLevel,
    fatigueLevel,
    breathingDifficulty,
    functionalLimitation,
    sleepHours,
    sleepQuality,
    usualBedtime,
    usualWakeTime,
  } = req.body

  if (!primaryCondition || typeof primaryCondition !== 'string' || !primaryCondition.trim()) {
    res.status(400).json({ error: 'Primary condition is required' })
    return
  }
  if (typeof conditionDurationMonths !== 'number' || conditionDurationMonths < 0) {
    res.status(400).json({ error: 'Condition duration must be a positive number' })
    return
  }
  if (!baselineDate || !validateDateString(baselineDate)) {
    res.status(400).json({ error: 'Invalid baseline date (YYYY-MM-DD)' })
    return
  }

  // Validate symptoms (0-10)
  for (const [key, val] of Object.entries({ painLevel, fatigueLevel, breathingDifficulty, functionalLimitation })) {
    if (typeof val !== 'number' || val < 0 || val > 10) {
      res.status(400).json({ error: `${key} must be between 0 and 10` })
      return
    }
  }

  if (typeof sleepHours !== 'number' || sleepHours < 0 || sleepHours > 24) {
    res.status(400).json({ error: 'Sleep hours must be between 0 and 24' })
    return
  }
  if (typeof sleepQuality !== 'number' || sleepQuality < 1 || sleepQuality > 5) {
    res.status(400).json({ error: 'Sleep quality must be between 1 and 5' })
    return
  }
  if (!usualBedtime || !validateTimeString(usualBedtime)) {
    res.status(400).json({ error: 'Invalid bedtime (HH:MM)' })
    return
  }
  if (!usualWakeTime || !validateTimeString(usualWakeTime)) {
    res.status(400).json({ error: 'Invalid wake time (HH:MM)' })
    return
  }

  const baseline = await Baseline.findOneAndUpdate(
    { userId: req.userId },
    {
      userId: req.userId,
      primaryCondition: primaryCondition.trim(),
      conditionDurationMonths,
      baselineDate,
      painLevel,
      fatigueLevel,
      breathingDifficulty,
      functionalLimitation,
      sleepHours,
      sleepQuality,
      usualBedtime,
      usualWakeTime,
    },
    { upsert: true, new: true, runValidators: true },
  )

  res.json({ baseline })
}
