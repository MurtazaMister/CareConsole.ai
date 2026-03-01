import { Request, Response } from 'express'
import { lookupDiseaseSymptoms } from '../utils/diseaseLookup'
import UserSchema from '../models/UserSchema'
import { redistributeWeights } from '../utils/transientDetection'

// ── Color palette for sliders ──────────────────────────────

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

// ── POST /api/disease/lookup ───────────────────────────────

export async function lookupDisease(req: Request, res: Response) {
  const { disease } = req.body

  if (!disease || typeof disease !== 'string' || !disease.trim()) {
    res.status(400).json({ error: 'Disease name is required' })
    return
  }

  const result = await lookupDiseaseSymptoms(disease.trim())
  res.json(result)
}

// ── POST /api/disease/initialize ───────────────────────────

export async function initializeSchema(req: Request, res: Response) {
  const { disease, symptoms, labels } = req.body

  if (!disease || typeof disease !== 'string') {
    res.status(400).json({ error: 'Disease name is required' })
    return
  }
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    res.status(400).json({ error: 'At least one symptom is required' })
    return
  }
  if (!labels || typeof labels !== 'object') {
    res.status(400).json({ error: 'Symptom labels are required' })
    return
  }

  // Build form schema deterministically from the symptom list
  const formSchema = buildFormSchema(symptoms, labels)

  // Create/update UserSchema
  const doc = await UserSchema.findOneAndUpdate(
    { userId: req.userId },
    {
      userId: req.userId,
      formSchema,
      generatedAt: new Date(),
      finalMetrics: symptoms,
      transientMetrics: [],
      tombstoneMetrics: [],
      transientCandidates: new Map(),
      context: {
        disease: disease.trim(),
        notes: '',
      },
    },
    { upsert: true, new: true },
  )

  res.json({
    schema: doc.formSchema,
    finalMetrics: doc.finalMetrics,
  })
}

// ── Schema Builder ─────────────────────────────────────────

function buildFormSchema(
  symptoms: string[],
  labels: Record<string, string>,
) {
  // Page 1: Core Symptoms (sliders)
  const sliderQuestions = symptoms.map((key, i) => {
    const colorInfo = SLIDER_COLORS[i % SLIDER_COLORS.length]
    return {
      id: key,
      type: 'slider' as const,
      label: labels[key] || key,
      question: `How would you rate your ${(labels[key] || key).toLowerCase()} TODAY?`,
      required: true,
      min: 0,
      max: 10,
      color: colorInfo.color,
      gradient: colorInfo.gradient,
      baselineKey: key,
      defaultValue: 0,
      weight: 0, // will be redistributed
    }
  })

  // Page 2: Health Check-in (toggles)
  const healthChecks = [
    {
      id: 'chestPainWeaknessConfusion',
      type: 'toggle' as const,
      label: 'Sudden chest pain, severe weakness, or confusion?',
      question: 'Sudden chest pain, severe weakness, or confusion?',
      required: false,
      group: 'redFlags',
    },
    {
      id: 'feverSweatsChills',
      type: 'toggle' as const,
      label: 'New fever, sweats, or chills?',
      question: 'New fever, sweats, or chills?',
      required: false,
      group: 'redFlags',
    },
    {
      id: 'missedOrNewMedication',
      type: 'toggle' as const,
      label: 'Missed any medications or started a new one?',
      question: 'Missed any medications or started a new one?',
      required: false,
      group: 'redFlags',
    },
  ]

  // Page 3: Sleep
  const sleepQuestions = [
    {
      id: 'sleepHours',
      type: 'numeric' as const,
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
      type: 'likert' as const,
      label: 'Sleep Quality',
      question: 'How was your sleep quality?',
      required: true,
      scale: 5,
      labels: { 1: 'Very Poor', 2: 'Poor', 3: 'Fair', 4: 'Good', 5: 'Very Good' },
      baselineKey: 'sleepQuality',
      defaultValue: 3,
    },
    {
      id: 'bedtime',
      type: 'time' as const,
      label: 'Bedtime',
      question: 'What time did you go to bed?',
      required: true,
      baselineKey: 'usualBedtime',
      defaultValue: '22:00',
    },
    {
      id: 'wakeTime',
      type: 'time' as const,
      label: 'Wake Time',
      question: 'What time did you wake up?',
      required: true,
      baselineKey: 'usualWakeTime',
      defaultValue: '06:00',
    },
  ]

  const schema = {
    pages: [
      {
        id: 'symptoms',
        title: 'Rate your symptoms',
        subtitle: 'Takes 30 seconds',
        questions: sliderQuestions,
      },
      {
        id: 'health-checks',
        title: 'Health Check-in',
        subtitle: 'Quick yes/no questions',
        description: 'Have you experienced any of the following?',
        layout: 'grouped',
        questions: healthChecks,
      },
      {
        id: 'sleep',
        title: 'Sleep',
        subtitle: 'How did you sleep?',
        questions: sleepQuestions,
      },
    ],
  }

  // Redistribute weights so they sum to 1.0
  return redistributeWeights(schema)
}
