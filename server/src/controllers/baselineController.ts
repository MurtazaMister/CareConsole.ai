import { Request, Response } from 'express'
import Baseline from '../models/Baseline'
import UserSchema from '../models/UserSchema'
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
    sleepHours,
    sleepQuality,
    usualBedtime,
    usualWakeTime,
    responses,
    finalMetrics,
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

  // Get active metrics from UserSchema or from request body
  let activeMetrics: string[] = finalMetrics || []
  if (activeMetrics.length === 0) {
    const userSchema = await UserSchema.findOne({ userId: req.userId })
    if (userSchema) {
      activeMetrics = userSchema.finalMetrics
    }
  }

  // Validate symptom responses dynamically
  if (responses && typeof responses === 'object') {
    for (const key of activeMetrics) {
      const val = responses[key]
      if (typeof val !== 'number' || val < 0 || val > 10) {
        res.status(400).json({ error: `${key} must be between 0 and 10` })
        return
      }
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
      finalMetrics: activeMetrics,
      sleepHours,
      sleepQuality,
      usualBedtime,
      usualWakeTime,
      responses: responses && typeof responses === 'object' ? responses : {},
    },
    { upsert: true, new: true, runValidators: true },
  )

  res.json({ baseline })
}
