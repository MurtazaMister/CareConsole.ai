import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { connectDB } from './config/db'
import User from './models/User'
import Baseline from './models/Baseline'
import DailyLog from './models/DailyLog'
import UserSchema from './models/UserSchema'
import DoctorClient from './models/DoctorClient'
import { calculateDeviation, calculateFlareRisk } from './utils/flareLogic'

// ── Helpers ──────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)))
}

function jitter(base: number, range: number, min = 0, max = 10): number {
  return clamp(base + (Math.random() * range * 2 - range), min, max)
}

function pickBedtime(base: string, jitterMins: number): string {
  const [h, m] = base.split(':').map(Number)
  const totalMins = h * 60 + m + Math.round((Math.random() - 0.5) * jitterMins * 2)
  const clamped = ((totalMins % 1440) + 1440) % 1440
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

// ── Types ────────────────────────────────────────────────

interface LogDay {
  responses: Record<string, number>
  sleep: number
  quality: number
  bed: string
  wake: string
  flags: { chest?: boolean; fever?: boolean; meds?: boolean }
  notes: string
}

interface MetricDef {
  key: string
  label: string
  color: string
  gradient: string
}

interface UserSeed {
  username: string
  email: string
  password: string
  profile: {
    age: number; heightCm: number; weightKg: number
    bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
    allergies: string; currentMedications: string
  }
  baseline: {
    primaryCondition: string
    conditionDurationMonths: number
    responses: Record<string, number>
    sleepHours: number; sleepQuality: number
    usualBedtime: string; usualWakeTime: string
  }
  finalMetrics: MetricDef[]
  transientMetric?: {
    def: MetricDef
    appearsAtDay: number // day index when transient starts showing in notes
    promoteAtDay: number // day index when promoted (after 3 mentions)
    baselineValue: number // baseline value for this metric
  }
  totalDays: number
  generateLogs: (b: UserSeed['baseline'], metrics: string[], transient?: UserSeed['transientMetric']) => LogDay[]
}

// ── Color palette ────────────────────────────────────────

const COLORS = [
  { color: '#ef4444', gradient: 'from-red-400 to-rose-500' },
  { color: '#f59e0b', gradient: 'from-amber-400 to-orange-500' },
  { color: '#06b6d4', gradient: 'from-cyan-400 to-teal-500' },
  { color: '#6366f1', gradient: 'from-indigo-400 to-blue-500' },
  { color: '#8b5cf6', gradient: 'from-violet-400 to-purple-500' },
  { color: '#ec4899', gradient: 'from-pink-400 to-rose-500' },
  { color: '#10b981', gradient: 'from-emerald-400 to-green-500' },
  { color: '#f97316', gradient: 'from-orange-400 to-amber-500' },
]

function buildMetrics(defs: { key: string; label: string }[]): MetricDef[] {
  return defs.map((d, i) => ({
    key: d.key,
    label: d.label,
    color: COLORS[i % COLORS.length].color,
    gradient: COLORS[i % COLORS.length].gradient,
  }))
}

// ── Schema builder (same as diseaseController) ───────────

function buildFormSchema(metrics: MetricDef[]) {
  const weight = +(1 / metrics.length).toFixed(4)
  const sliderQuestions = metrics.map((m, i) => ({
    id: m.key,
    type: 'slider',
    label: m.label,
    question: `How would you rate your ${m.label.toLowerCase()} TODAY?`,
    required: true,
    min: 0,
    max: 10,
    color: m.color,
    gradient: m.gradient,
    baselineKey: m.key,
    defaultValue: 0,
    weight: i === metrics.length - 1 ? +(1 - weight * (metrics.length - 1)).toFixed(4) : weight,
  }))

  return {
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
        questions: [
          { id: 'chestPainWeaknessConfusion', type: 'toggle', label: 'Sudden chest pain, severe weakness, or confusion?', question: 'Sudden chest pain, severe weakness, or confusion?', required: false, group: 'redFlags' },
          { id: 'feverSweatsChills', type: 'toggle', label: 'New fever, sweats, or chills?', question: 'New fever, sweats, or chills?', required: false, group: 'redFlags' },
          { id: 'missedOrNewMedication', type: 'toggle', label: 'Missed any medications or started a new one?', question: 'Missed any medications or started a new one?', required: false, group: 'redFlags' },
        ],
      },
      {
        id: 'sleep',
        title: 'Sleep',
        subtitle: 'How did you sleep?',
        questions: [
          { id: 'sleepHours', type: 'numeric', label: 'Hours Slept', question: 'How many hours did you sleep?', required: true, min: 0, max: 24, unit: 'hours', placeholder: '7', baselineKey: 'sleepHours', defaultValue: 7 },
          { id: 'sleepQuality', type: 'likert', label: 'Sleep Quality', question: 'How was your sleep quality?', required: true, scale: 5, labels: { 1: 'Very Poor', 2: 'Poor', 3: 'Fair', 4: 'Good', 5: 'Very Good' }, baselineKey: 'sleepQuality', defaultValue: 3 },
          { id: 'bedtime', type: 'time', label: 'Bedtime', question: 'What time did you go to bed?', required: true, baselineKey: 'usualBedtime', defaultValue: '22:00' },
          { id: 'wakeTime', type: 'time', label: 'Wake Time', question: 'What time did you wake up?', required: true, baselineKey: 'usualWakeTime', defaultValue: '06:00' },
        ],
      },
    ],
  }
}

// ── Disease-specific log generators ──────────────────────

function generateSLE(b: UserSeed['baseline'], metrics: string[], transient?: UserSeed['transientMetric']): LogDay[] {
  const logs: LogDay[] = []
  const keys = metrics // ['jointPain', 'fatigue', 'skinRash', 'photosensitivity']

  for (let day = 0; day < 90; day++) {
    const responses: Record<string, number> = {}
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    // Stable (days 0-18)
    if (day < 19) {
      for (const k of keys) responses[k] = jitter(b.responses[k], 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 5) notes = 'Good day, went for a short walk.'
      if (day === 12) notes = 'Mild joint stiffness in the morning.'
      if (day === 16) notes = 'Spent some time outdoors, wore sunscreen.'
    }
    // Flare buildup (days 19-24)
    else if (day < 25) {
      const ramp = (day - 19) / 5
      responses[keys[0]] = clamp(b.responses[keys[0]] + Math.round(ramp * 4), 0, 10)  // jointPain
      responses[keys[1]] = clamp(b.responses[keys[1]] + Math.round(ramp * 4), 0, 10)  // fatigue
      responses[keys[2]] = clamp(b.responses[keys[2]] + Math.round(ramp * 2), 0, 10)  // skinRash
      responses[keys[3]] = clamp(b.responses[keys[3]] + Math.round(ramp * 2), 0, 10)  // photosensitivity
      sleep = clamp(b.sleepHours - Math.round(ramp * 2), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(ramp * 1.5), 1, 5)
      if (day === 20) notes = 'Joints aching more than usual.'
      if (day === 22) notes = 'Very tired, skipped evening plans.'
      if (day === 23) { flags.meds = true; notes = 'Missed morning dose of HCQ.' }
      if (day === 24) notes = 'Butterfly rash appearing on cheeks.'
    }
    // Flare peak (days 25-31)
    else if (day < 32) {
      responses[keys[0]] = jitter(8, 1)
      responses[keys[1]] = jitter(9, 0.5)
      responses[keys[2]] = jitter(7, 1)
      responses[keys[3]] = jitter(5, 1)
      sleep = jitter(4, 0.5, 3, 12)
      quality = jitter(1, 0.5, 1, 5)
      if (day === 25) { flags.fever = true; notes = 'Fever 38.4C overnight. Called rheumatologist.' }
      if (day === 27) { flags.fever = true; notes = 'Fever persists. Started prednisone burst.' }
      if (day === 28) { flags.meds = true; notes = 'New medication: Prednisone 40mg taper.' }
      if (day === 30) notes = 'Fever broke, still very weak.'
    }
    // Recovery (days 32-45)
    else if (day < 46) {
      const recover = (day - 32) / 13
      responses[keys[0]] = clamp(8 - Math.round(recover * 4), 0, 10)
      responses[keys[1]] = clamp(9 - Math.round(recover * 4), 0, 10)
      responses[keys[2]] = clamp(7 - Math.round(recover * 4), 0, 10)
      responses[keys[3]] = clamp(5 - Math.round(recover * 3), 0, 10)
      sleep = clamp(4 + Math.round(recover * 3), 3, 12)
      quality = clamp(1 + Math.round(recover * 2), 1, 5)
      if (day === 35) notes = 'Slowly improving. Tapering prednisone.'
      if (day === 40) notes = 'Managed light housework today.'
      if (day === 44) notes = 'Almost back to baseline.'
    }
    // Second stable (days 46-64)
    else if (day < 65) {
      for (const k of keys) responses[k] = jitter(b.responses[k] + (k === keys[1] ? 1 : 0), 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 50) notes = 'Feeling much more like myself.'
      if (day === 58) notes = 'Good energy today, cooked dinner.'
    }
    // Minor flare (days 65-72)
    else if (day < 73) {
      const ramp = Math.sin(((day - 65) / 7) * Math.PI)
      for (const k of keys) responses[k] = clamp(b.responses[k] + Math.round(ramp * 2), 0, 10)
      sleep = clamp(b.sleepHours - Math.round(ramp), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(ramp), 1, 5)
      if (day === 68) notes = 'Stress at work, joints flaring up.'
      if (day === 70) notes = 'Mild flare, manageable with rest.'
    }
    // Return to stable (days 73-89)
    else {
      for (const k of keys) responses[k] = jitter(b.responses[k], 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 80) notes = 'Good week. Follow-up labs look stable.'
      if (day === 87) notes = 'Feeling well, maintaining routine.'
    }

    // Transient symptom simulation (butterflyRash)
    if (transient && day >= transient.appearsAtDay) {
      // Notes mentioning the symptom for 3 consecutive days
      if (day === transient.appearsAtDay) notes = 'Noticed a rash spreading across my cheeks.'
      if (day === transient.appearsAtDay + 1) notes = 'Butterfly rash still visible, skin feels warm.'
      if (day === transient.appearsAtDay + 2) notes = 'Rash persists across nose and cheeks.'

      // After promotion, track it as a value
      if (day >= transient.promoteAtDay) {
        const severity = day < 50 ? jitter(5, 2) : jitter(2, 1)
        responses[transient.def.key] = severity
      }
    }

    logs.push({
      responses, sleep, quality,
      bed: pickBedtime(b.usualBedtime, day >= 25 && day < 32 ? 60 : 30),
      wake: pickBedtime(b.usualWakeTime, 30),
      flags, notes,
    })
  }
  return logs
}

function generatePAH(b: UserSeed['baseline'], metrics: string[], transient?: UserSeed['transientMetric']): LogDay[] {
  const logs: LogDay[] = []
  const keys = metrics

  for (let day = 0; day < 60; day++) {
    const responses: Record<string, number> = {}
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    if (day < 21) {
      const drift = day / 20 * 2
      responses[keys[0]] = clamp(b.responses[keys[0]] + Math.round(drift), 0, 10) // breathingDifficulty
      responses[keys[1]] = clamp(b.responses[keys[1]] + Math.round(drift * 0.8), 0, 10) // exerciseIntolerance
      responses[keys[2]] = clamp(b.responses[keys[2]] + Math.round(drift * 0.8), 0, 10) // fatigue
      responses[keys[3]] = clamp(b.responses[keys[3]] + Math.round(drift * 0.6), 0, 10) // chestTightness
      sleep = clamp(b.sleepHours - Math.round(drift * 0.3), 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 7) notes = 'Slightly more winded on stairs.'
      if (day === 14) notes = 'Had to rest halfway through grocery run.'
      if (day === 18) notes = 'Noticed ankles swelling in evening.'
    } else if (day < 33) {
      const severity = Math.sin(((day - 21) / 11) * Math.PI)
      responses[keys[0]] = clamp(b.responses[keys[0]] + 2 + Math.round(severity * 3), 0, 10)
      responses[keys[1]] = clamp(b.responses[keys[1]] + 2 + Math.round(severity * 3), 0, 10)
      responses[keys[2]] = clamp(b.responses[keys[2]] + 2 + Math.round(severity * 3), 0, 10)
      responses[keys[3]] = clamp(b.responses[keys[3]] + 2 + Math.round(severity * 2), 0, 10)
      sleep = clamp(b.sleepHours - 1 - Math.round(severity), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(severity * 1.5), 1, 5)
      if (day === 22) notes = 'Shortness of breath at rest now.'
      if (day === 25) { flags.chest = true; notes = 'Chest tightness, went to ER.' }
      if (day === 26) { flags.meds = true; notes = 'Started Sildenafil. Admitted overnight.' }
      if (day === 28) notes = 'Discharged. Oxygen sat improved.'
      if (day === 31) notes = 'Still adjusting to new medication.'
    } else if (day < 46) {
      const recover = (day - 33) / 12
      responses[keys[0]] = clamp(b.responses[keys[0]] + 4 - Math.round(recover * 3.5), 0, 10)
      responses[keys[1]] = clamp(b.responses[keys[1]] + 3 - Math.round(recover * 3), 0, 10)
      responses[keys[2]] = clamp(b.responses[keys[2]] + 3 - Math.round(recover * 3), 0, 10)
      responses[keys[3]] = clamp(b.responses[keys[3]] + 2 - Math.round(recover * 2), 0, 10)
      sleep = clamp(b.sleepHours - 1 + Math.round(recover * 1.5), 3, 12)
      quality = clamp(b.sleepQuality - 1 + Math.round(recover * 1.5), 1, 5)
      if (day === 36) notes = 'Breathing noticeably better on Sildenafil.'
      if (day === 42) notes = 'Walked 10 minutes without stopping.'
    } else {
      for (const k of keys) responses[k] = jitter(b.responses[k] + 1, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 50) notes = 'Stable. Pulmonologist pleased with progress.'
      if (day === 56) notes = 'Managed a full day out with family.'
    }

    // Transient: ankleSwelling
    if (transient && day >= transient.appearsAtDay) {
      if (day === transient.appearsAtDay) notes = 'Ankles are swollen, feels tight.'
      if (day === transient.appearsAtDay + 1) notes = 'Ankle swelling persists, hard to walk.'
      if (day === transient.appearsAtDay + 2) notes = 'Swelling still there, elevating helps.'
      if (day >= transient.promoteAtDay) {
        responses[transient.def.key] = day < 35 ? jitter(5, 2) : jitter(2, 1)
      }
    }

    logs.push({ responses, sleep, quality, bed: pickBedtime(b.usualBedtime, 30), wake: pickBedtime(b.usualWakeTime, 30), flags, notes })
  }
  return logs
}

function generateEDS(b: UserSeed['baseline'], metrics: string[], transient?: UserSeed['transientMetric']): LogDay[] {
  const logs: LogDay[] = []
  const keys = metrics

  for (let day = 0; day < 90; day++) {
    const responses: Record<string, number> = {}
    let sleep: number, quality: number
    let flags: LogDay['flags'] = {}
    let notes = ''
    const randomBad = Math.random()

    const inFlareCluster = (day >= 15 && day < 21) || (day >= 38 && day < 45) || (day >= 60 && day < 67)

    if (inFlareCluster) {
      responses[keys[0]] = jitter(b.responses[keys[0]] + 3, 1)  // jointPain
      responses[keys[1]] = jitter(b.responses[keys[1]] + 2, 1)  // subluxations
      responses[keys[2]] = jitter(b.responses[keys[2]] + 2, 1)  // fatigue
      responses[keys[3]] = jitter(b.responses[keys[3]] + 3, 1)  // functionalLimitation
      sleep = jitter(b.sleepHours - 1.5, 0.5, 3, 12)
      quality = jitter(b.sleepQuality - 1, 0.5, 1, 5)
      if (day === 16) notes = 'Multiple joint subluxations today.'
      if (day === 19) notes = 'Knee gave out on stairs. Using brace.'
      if (day === 39) notes = 'Weather changed, everything hurts.'
      if (day === 42) notes = 'Cannot grip anything, hands are bad.'
      if (day === 61) notes = 'Hormonal flare, whole body aching.'
      if (day === 65) notes = 'Hip subluxed twice today.'
    } else if (randomBad < 0.15) {
      for (const k of keys) responses[k] = jitter(b.responses[k] + 2, 1)
      sleep = jitter(b.sleepHours - 1, 0.5, 3, 12)
      quality = jitter(b.sleepQuality - 1, 0.5, 1, 5)
      const badNotes = ['Overdid it yesterday.', 'Shoulder popped out.', 'Back spasms.', 'Brain fog really bad.']
      notes = badNotes[Math.floor(Math.random() * badNotes.length)]
    } else if (randomBad > 0.80) {
      for (const k of keys) responses[k] = jitter(b.responses[k] - 1, 0.5)
      sleep = jitter(b.sleepHours + 1, 0.5, 3, 12)
      quality = jitter(b.sleepQuality + 1, 0.5, 1, 5)
      const goodNotes = ['Good day, got things done.', 'Lower pain, gentle swim.', 'Slept well.', '']
      notes = goodNotes[Math.floor(Math.random() * goodNotes.length)]
    } else {
      for (const k of keys) responses[k] = jitter(b.responses[k], 1.5)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
    }

    if (day === 30 || day === 55) {
      flags.meds = true
      notes = day === 30 ? 'Forgot pain medication, rough evening.' : 'Pharmacy delay, missed dose.'
    }

    // Transient: brainFog
    if (transient && day >= transient.appearsAtDay) {
      if (day === transient.appearsAtDay) notes = 'Brain fog is terrible, can\'t concentrate.'
      if (day === transient.appearsAtDay + 1) notes = 'Brain fog continues, lost my train of thought repeatedly.'
      if (day === transient.appearsAtDay + 2) notes = 'Still foggy, cognitive issues persistent.'
      if (day >= transient.promoteAtDay) {
        responses[transient.def.key] = inFlareCluster ? jitter(6, 2) : jitter(3, 1.5)
      }
    }

    logs.push({ responses, sleep, quality, bed: pickBedtime(b.usualBedtime, inFlareCluster ? 60 : 30), wake: pickBedtime(b.usualWakeTime, 30), flags, notes })
  }
  return logs
}

function generateMG(b: UserSeed['baseline'], metrics: string[], transient?: UserSeed['transientMetric']): LogDay[] {
  const logs: LogDay[] = []
  const keys = metrics

  for (let day = 0; day < 45; day++) {
    const responses: Record<string, number> = {}
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    if (day < 13) {
      for (const k of keys) responses[k] = jitter(b.responses[k], 1.5)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 3) notes = 'Double vision brief episode this evening.'
      if (day === 8) notes = 'Difficulty swallowing at dinner.'
      if (day === 11) notes = 'Arms very weak by afternoon.'
    } else if (day < 23) {
      const ramp = Math.min((day - 13) / 6, 1)
      const peak = day >= 17 && day < 22
      responses[keys[0]] = clamp(b.responses[keys[0]] + Math.round(ramp * 4) + (peak ? 1 : 0), 0, 10) // muscleWeakness
      responses[keys[1]] = clamp(b.responses[keys[1]] + Math.round(ramp * 4) + (peak ? 1 : 0), 0, 10) // fatigue
      responses[keys[2]] = clamp(b.responses[keys[2]] + Math.round(ramp * 3) + (peak ? 1 : 0), 0, 10) // swallowingDifficulty
      responses[keys[3]] = clamp(b.responses[keys[3]] + Math.round(ramp * 3) + (peak ? 1 : 0), 0, 10) // breathingDifficulty
      sleep = clamp(b.sleepHours - Math.round(ramp * 2), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(ramp * 1.5), 1, 5)
      if (day === 14) notes = 'Drooping eyelids worse than usual.'
      if (day === 17) { flags.chest = true; notes = 'Breathing labored. Went to ER.' }
      if (day === 18) { flags.meds = true; notes = 'Started IVIG treatment in hospital.' }
      if (day === 19) notes = 'Day 2 of IVIG. Headache from infusion.'
      if (day === 21) notes = 'Discharged. Feeling slightly better.'
    } else if (day < 36) {
      const recover = (day - 23) / 12
      responses[keys[0]] = clamp(b.responses[keys[0]] + 4 - Math.round(recover * 4), 0, 10)
      responses[keys[1]] = clamp(b.responses[keys[1]] + 4 - Math.round(recover * 4), 0, 10)
      responses[keys[2]] = clamp(b.responses[keys[2]] + 3 - Math.round(recover * 3), 0, 10)
      responses[keys[3]] = clamp(b.responses[keys[3]] + 3 - Math.round(recover * 3), 0, 10)
      sleep = clamp(b.sleepHours - 1 + Math.round(recover * 1.5), 3, 12)
      quality = clamp(b.sleepQuality - 1 + Math.round(recover * 1.5), 1, 5)
      if (day === 26) notes = 'Swallowing easier now.'
      if (day === 30) notes = 'Can hold a book again without arms shaking.'
      if (day === 34) notes = 'IVIG really helped. Neurologist follow-up.'
    } else {
      for (const k of keys) responses[k] = jitter(b.responses[k], 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 38) notes = 'Good day, minimal ptosis.'
      if (day === 43) notes = 'Feeling strongest in weeks.'
    }

    // Transient: doubleVision
    if (transient && day >= transient.appearsAtDay) {
      if (day === transient.appearsAtDay) notes = 'Seeing double again, especially when tired.'
      if (day === transient.appearsAtDay + 1) notes = 'Double vision persists, hard to read.'
      if (day === transient.appearsAtDay + 2) notes = 'Still having double vision episodes.'
      if (day >= transient.promoteAtDay) {
        responses[transient.def.key] = day < 23 ? jitter(5, 2) : jitter(2, 1)
      }
    }

    logs.push({ responses, sleep, quality, bed: pickBedtime(b.usualBedtime, 30), wake: pickBedtime(b.usualWakeTime, 30), flags, notes })
  }
  return logs
}

function generateSSc(b: UserSeed['baseline'], metrics: string[], transient?: UserSeed['transientMetric']): LogDay[] {
  const logs: LogDay[] = []
  const keys = metrics

  for (let day = 0; day < 30; day++) {
    const responses: Record<string, number> = {}
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    if (day < 9) {
      for (const k of keys) responses[k] = jitter(b.responses[k], 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 2) notes = 'Getting used to tracking symptoms.'
      if (day === 5) notes = 'Fingers stiff in the morning as usual.'
      if (day === 8) notes = 'Skin feels tighter on forearms.'
    } else if (day < 19) {
      const severity = Math.sin(((day - 9) / 9) * Math.PI)
      responses[keys[0]] = clamp(b.responses[keys[0]] + Math.round(severity * 3), 0, 10) // skinTightness
      responses[keys[1]] = clamp(b.responses[keys[1]] + Math.round(severity * 3), 0, 10) // fingerPain
      responses[keys[2]] = clamp(b.responses[keys[2]] + Math.round(severity * 2), 0, 10) // fatigue
      responses[keys[3]] = clamp(b.responses[keys[3]] + Math.round(severity * 1.5), 0, 10) // breathingDifficulty
      sleep = clamp(b.sleepHours - Math.round(severity * 1.5), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(severity), 1, 5)
      if (day === 10) notes = 'Cold snap. Fingers turning white and blue.'
      if (day === 12) notes = 'Digital ulcer on right index finger.'
      if (day === 13) { flags.fever = true; notes = 'Low fever, ulcer may be infected.' }
      if (day === 14) { flags.meds = true; notes = 'Started Nifedipine for Raynaud\'s.' }
      if (day === 16) notes = 'Fingers slightly less cold. Nifedipine helping.'
    } else {
      const recover = (day - 19) / 10
      responses[keys[0]] = clamp(b.responses[keys[0]] + 2 - Math.round(recover * 2), 0, 10)
      responses[keys[1]] = clamp(b.responses[keys[1]] + 2 - Math.round(recover * 2), 0, 10)
      responses[keys[2]] = clamp(b.responses[keys[2]] + 1 - Math.round(recover), 0, 10)
      responses[keys[3]] = jitter(b.responses[keys[3]], 0.5)
      sleep = clamp(b.sleepHours - 1 + Math.round(recover), 3, 12)
      quality = clamp(b.sleepQuality - 1 + Math.round(recover), 1, 5)
      if (day === 22) notes = 'Warming up outside. Hands much better.'
      if (day === 25) notes = 'Digital ulcer healing well.'
      if (day === 28) notes = 'Nearly back to normal. Keep wearing gloves.'
    }

    // Transient: raynaudsSymptoms
    if (transient && day >= transient.appearsAtDay) {
      if (day === transient.appearsAtDay) notes = 'Raynaud\'s attack, fingers turned white then blue.'
      if (day === transient.appearsAtDay + 1) notes = 'Another Raynaud\'s episode, very painful.'
      if (day === transient.appearsAtDay + 2) notes = 'Raynaud\'s continuing, color changes in fingers.'
      if (day >= transient.promoteAtDay) {
        responses[transient.def.key] = day < 19 ? jitter(6, 2) : jitter(3, 1)
      }
    }

    logs.push({ responses, sleep, quality, bed: pickBedtime(b.usualBedtime, 30), wake: pickBedtime(b.usualWakeTime, 30), flags, notes })
  }
  return logs
}

// ── User definitions ─────────────────────────────────────

const USERS: UserSeed[] = [
  {
    username: 'sarah',
    email: 'sarah@hackrare.com',
    password: 'sarah123',
    profile: {
      age: 32, heightCm: 165, weightKg: 58, bloodGroup: 'A+',
      allergies: 'Sulfa drugs',
      currentMedications: 'Hydroxychloroquine 200mg BID, Folic acid 5mg daily',
    },
    baseline: {
      primaryCondition: 'Systemic Lupus Erythematosus (SLE)',
      conditionDurationMonths: 48,
      responses: { jointPain: 4, fatigue: 5, skinRash: 2, photosensitivity: 3 },
      sleepHours: 7, sleepQuality: 3, usualBedtime: '23:00', usualWakeTime: '07:00',
    },
    finalMetrics: buildMetrics([
      { key: 'jointPain', label: 'Joint Pain' },
      { key: 'fatigue', label: 'Fatigue' },
      { key: 'skinRash', label: 'Skin Rash' },
      { key: 'photosensitivity', label: 'Photosensitivity' },
    ]),
    transientMetric: {
      def: { key: 'butterflyRash', label: 'Butterfly Rash', color: '#ec4899', gradient: 'from-pink-400 to-rose-500' },
      appearsAtDay: 40,
      promoteAtDay: 43,
      baselineValue: 0,
    },
    totalDays: 90,
    generateLogs: generateSLE,
  },
  {
    username: 'marcus',
    email: 'marcus@hackrare.com',
    password: 'marcus123',
    profile: {
      age: 45, heightCm: 180, weightKg: 82, bloodGroup: 'O-',
      allergies: 'None',
      currentMedications: 'Ambrisentan 10mg daily, Warfarin 5mg daily',
    },
    baseline: {
      primaryCondition: 'Pulmonary Arterial Hypertension (PAH)',
      conditionDurationMonths: 24,
      responses: { breathingDifficulty: 5, exerciseIntolerance: 4, fatigue: 4, chestTightness: 3 },
      sleepHours: 6, sleepQuality: 3, usualBedtime: '22:30', usualWakeTime: '06:30',
    },
    finalMetrics: buildMetrics([
      { key: 'breathingDifficulty', label: 'Breathing Difficulty' },
      { key: 'exerciseIntolerance', label: 'Exercise Intolerance' },
      { key: 'fatigue', label: 'Fatigue' },
      { key: 'chestTightness', label: 'Chest Tightness' },
    ]),
    transientMetric: {
      def: { key: 'ankleSwelling', label: 'Ankle Swelling', color: '#10b981', gradient: 'from-emerald-400 to-green-500' },
      appearsAtDay: 18,
      promoteAtDay: 21,
      baselineValue: 0,
    },
    totalDays: 60,
    generateLogs: generatePAH,
  },
  {
    username: 'priya',
    email: 'priya@hackrare.com',
    password: 'priya123',
    profile: {
      age: 27, heightCm: 160, weightKg: 52, bloodGroup: 'B+',
      allergies: 'NSAIDs (GI intolerance)',
      currentMedications: 'Duloxetine 60mg daily, Magnesium glycinate 400mg',
    },
    baseline: {
      primaryCondition: 'Hypermobile Ehlers-Danlos Syndrome (hEDS)',
      conditionDurationMonths: 72,
      responses: { jointPain: 5, subluxations: 4, fatigue: 4, functionalLimitation: 4 },
      sleepHours: 6, sleepQuality: 2, usualBedtime: '00:00', usualWakeTime: '08:00',
    },
    finalMetrics: buildMetrics([
      { key: 'jointPain', label: 'Joint Pain' },
      { key: 'subluxations', label: 'Subluxations' },
      { key: 'fatigue', label: 'Fatigue' },
      { key: 'functionalLimitation', label: 'Functional Limitation' },
    ]),
    transientMetric: {
      def: { key: 'brainFog', label: 'Brain Fog', color: '#8b5cf6', gradient: 'from-violet-400 to-purple-500' },
      appearsAtDay: 30,
      promoteAtDay: 33,
      baselineValue: 0,
    },
    totalDays: 90,
    generateLogs: generateEDS,
  },
  {
    username: 'james',
    email: 'james@hackrare.com',
    password: 'james123',
    profile: {
      age: 55, heightCm: 175, weightKg: 78, bloodGroup: 'AB+',
      allergies: 'Penicillin',
      currentMedications: 'Pyridostigmine 60mg TID, Mycophenolate 1000mg BID',
    },
    baseline: {
      primaryCondition: 'Myasthenia Gravis',
      conditionDurationMonths: 18,
      responses: { muscleWeakness: 6, fatigue: 6, swallowingDifficulty: 3, breathingDifficulty: 3 },
      sleepHours: 7, sleepQuality: 3, usualBedtime: '22:00', usualWakeTime: '06:00',
    },
    finalMetrics: buildMetrics([
      { key: 'muscleWeakness', label: 'Muscle Weakness' },
      { key: 'fatigue', label: 'Fatigue' },
      { key: 'swallowingDifficulty', label: 'Swallowing Difficulty' },
      { key: 'breathingDifficulty', label: 'Breathing Difficulty' },
    ]),
    transientMetric: {
      def: { key: 'doubleVision', label: 'Double Vision', color: '#f97316', gradient: 'from-orange-400 to-amber-500' },
      appearsAtDay: 14,
      promoteAtDay: 17,
      baselineValue: 0,
    },
    totalDays: 45,
    generateLogs: generateMG,
  },
  {
    username: 'elena',
    email: 'elena@hackrare.com',
    password: 'elena123',
    profile: {
      age: 40, heightCm: 168, weightKg: 60, bloodGroup: 'A-',
      allergies: 'Latex',
      currentMedications: 'Mycophenolate 500mg BID, Omeprazole 20mg daily',
    },
    baseline: {
      primaryCondition: 'Systemic Sclerosis (Scleroderma)',
      conditionDurationMonths: 30,
      responses: { skinTightness: 4, fingerPain: 5, fatigue: 5, breathingDifficulty: 4 },
      sleepHours: 6, sleepQuality: 3, usualBedtime: '23:30', usualWakeTime: '07:30',
    },
    finalMetrics: buildMetrics([
      { key: 'skinTightness', label: 'Skin Tightness' },
      { key: 'fingerPain', label: 'Finger Pain' },
      { key: 'fatigue', label: 'Fatigue' },
      { key: 'breathingDifficulty', label: 'Breathing Difficulty' },
    ]),
    transientMetric: {
      def: { key: 'raynaudsSymptoms', label: 'Raynaud\'s Symptoms', color: '#06b6d4', gradient: 'from-cyan-400 to-teal-500' },
      appearsAtDay: 10,
      promoteAtDay: 13,
      baselineValue: 0,
    },
    totalDays: 30,
    generateLogs: generateSSc,
  },
]

// ── Main seed function ───────────────────────────────────

async function seed() {
  await connectDB()

  // Clean existing seed users
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email })
    if (existing) {
      await DailyLog.deleteMany({ userId: existing._id })
      await Baseline.deleteMany({ userId: existing._id })
      await UserSchema.deleteMany({ userId: existing._id })
      await User.deleteOne({ _id: existing._id })
    }
  }
  // Also clean old demo user
  const oldDemo = await User.findOne({ email: 'demo@hackrare.com' })
  if (oldDemo) {
    await DailyLog.deleteMany({ userId: oldDemo._id })
    await Baseline.deleteMany({ userId: oldDemo._id })
    await UserSchema.deleteMany({ userId: oldDemo._id })
    await User.deleteOne({ _id: oldDemo._id })
  }
  console.log('Cleaned up existing seed data\n')

  for (const u of USERS) {
    // Create user
    const hashedPassword = await bcrypt.hash(u.password, 10)
    const user = await User.create({
      username: u.username,
      email: u.email,
      password: hashedPassword,
      role: 'patient',
      profile: { ...u.profile, completedAt: new Date().toISOString() },
    })

    const finalMetricKeys = u.finalMetrics.map((m) => m.key)

    // Build form schema (with transient metric included after its promote day)
    const allMetrics = [...u.finalMetrics]
    if (u.transientMetric) {
      allMetrics.push(u.transientMetric.def)
    }
    const formSchema = buildFormSchema(allMetrics)

    // Create UserSchema
    await UserSchema.create({
      userId: user._id,
      formSchema,
      generatedAt: new Date(),
      finalMetrics: finalMetricKeys,
      transientMetrics: u.transientMetric ? [u.transientMetric.def.key] : [],
      tombstoneMetrics: [],
      transientCandidates: new Map(),
      context: {
        disease: u.baseline.primaryCondition,
        notes: '',
      },
    })

    // Create baseline
    const baselineDateStr = dateStr(u.totalDays)
    await Baseline.create({
      userId: user._id,
      primaryCondition: u.baseline.primaryCondition,
      conditionDurationMonths: u.baseline.conditionDurationMonths,
      baselineDate: baselineDateStr,
      finalMetrics: finalMetricKeys,
      sleepHours: u.baseline.sleepHours,
      sleepQuality: u.baseline.sleepQuality,
      usualBedtime: u.baseline.usualBedtime,
      usualWakeTime: u.baseline.usualWakeTime,
      responses: u.baseline.responses,
    })

    // Generate logs
    const logDays = u.generateLogs(u.baseline, finalMetricKeys, u.transientMetric)

    let logCount = 0
    for (let i = 0; i < logDays.length; i++) {
      const l = logDays[i]
      const logDateStr = dateStr(u.totalDays - i)

      // Determine which metrics are active at this point in time
      const isTransientActive = u.transientMetric && i >= u.transientMetric.promoteAtDay
      const currentTransient = isTransientActive ? [u.transientMetric!.def.key] : []
      const activeMetrics = [...finalMetricKeys, ...currentTransient]

      const { perMetric, total } = calculateDeviation(l.responses, u.baseline.responses, activeMetrics)
      const redFlags = {
        chestPainWeaknessConfusion: !!l.flags.chest,
        feverSweatsChills: !!l.flags.fever,
        missedOrNewMedication: !!l.flags.meds,
      }
      const flareRiskLevel = calculateFlareRisk(total, perMetric, redFlags, activeMetrics.length)

      await DailyLog.create({
        userId: user._id,
        date: logDateStr,
        finalMetrics: finalMetricKeys,
        transientMetrics: currentTransient,
        tombstoneMetrics: [],
        redFlags,
        sleepHours: l.sleep,
        sleepQuality: l.quality,
        bedtime: l.bed,
        wakeTime: l.wake,
        notes: l.notes,
        responses: l.responses,
        deviationScore: total,
        flareRiskLevel,
      })
      logCount++
    }

    console.log(`[${u.username}] ${u.baseline.primaryCondition}`)
    console.log(`  Login: ${u.email} / ${u.password}`)
    console.log(`  Baseline: ${baselineDateStr} (${u.baseline.conditionDurationMonths} months)`)
    console.log(`  Metrics: ${finalMetricKeys.join(', ')}`)
    if (u.transientMetric) {
      console.log(`  Transient: ${u.transientMetric.def.key} (appears day ${u.transientMetric.appearsAtDay}, promoted day ${u.transientMetric.promoteAtDay})`)
    }
    console.log(`  Logs: ${logCount} days`)
    console.log()
  }

  // ── Seed Doctors ───────────────────────────────────────
  //
  // Doctor accounts have role: 'doctor' and skip patient onboarding.
  // Each doctor is assigned a set of patient clients via the DoctorClient
  // junction model, giving them read-access to those patients' baselines,
  // daily logs, schemas, and flare insights through the doctor dashboard.
  //
  // dr_chen  — Rheumatologist focus. Clients: sarah (SLE), priya (hEDS), elena (Scleroderma)
  // dr_okafor — Pulmonologist / Neurologist focus. Clients: marcus (PAH), james (Myasthenia Gravis)

  const DOCTORS = [
    {
      username: 'dr_chen',
      email: 'dr.chen@hackrare.com',
      password: 'drchen123',
      profile: {
        age: 45, heightCm: 170, weightKg: 68, bloodGroup: 'O+' as const,
        allergies: 'None',
        currentMedications: 'None',
      },
      clientUsernames: ['sarah', 'priya', 'elena'],
    },
    {
      username: 'dr_okafor',
      email: 'dr.okafor@hackrare.com',
      password: 'drokafor123',
      profile: {
        age: 52, heightCm: 183, weightKg: 85, bloodGroup: 'B+' as const,
        allergies: 'None',
        currentMedications: 'None',
      },
      clientUsernames: ['marcus', 'james'],
    },
  ]

  // Clean existing doctor users
  for (const d of DOCTORS) {
    const existing = await User.findOne({ email: d.email })
    if (existing) {
      await DoctorClient.deleteMany({ doctorId: existing._id })
      await User.deleteOne({ _id: existing._id })
    }
  }

  for (const d of DOCTORS) {
    const hashedPassword = await bcrypt.hash(d.password, 10)
    const doctor = await User.create({
      username: d.username,
      email: d.email,
      password: hashedPassword,
      role: 'doctor',
      profile: { ...d.profile, completedAt: new Date().toISOString() },
    })

    // Assign clients
    for (const clientUsername of d.clientUsernames) {
      const patient = await User.findOne({ username: clientUsername })
      if (patient) {
        await DoctorClient.create({ doctorId: doctor._id, patientId: patient._id })
      }
    }

    console.log(`[${d.username}] Doctor`)
    console.log(`  Login: ${d.email} / ${d.password}`)
    console.log(`  Clients: ${d.clientUsernames.join(', ')}`)
    console.log()
  }

  // ── Summary ────────────────────────────────────────────

  console.log('=== Patient Accounts ===')
  console.log('┌──────────┬────────────────────────┬────────────┬──────┐')
  console.log('│ Username │ Email                  │ Password   │ Days │')
  console.log('├──────────┼────────────────────────┼────────────┼──────┤')
  for (const u of USERS) {
    const un = u.username.padEnd(8)
    const em = u.email.padEnd(22)
    const pw = u.password.padEnd(10)
    const dy = String(u.totalDays).padStart(4)
    console.log(`│ ${un} │ ${em} │ ${pw} │ ${dy} │`)
  }
  console.log('└──────────┴────────────────────────┴────────────┴──────┘')
  console.log()
  console.log('=== Doctor Accounts ===')
  console.log('┌────────────┬──────────────────────────┬──────────────┬─────────────────────┐')
  console.log('│ Username   │ Email                    │ Password     │ Clients             │')
  console.log('├────────────┼──────────────────────────┼──────────────┼─────────────────────┤')
  for (const d of DOCTORS) {
    const un = d.username.padEnd(10)
    const em = d.email.padEnd(24)
    const pw = d.password.padEnd(12)
    const cl = d.clientUsernames.join(', ').padEnd(19)
    console.log(`│ ${un} │ ${em} │ ${pw} │ ${cl} │`)
  }
  console.log('└────────────┴──────────────────────────┴──────────────┴─────────────────────┘')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
