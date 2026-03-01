import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { connectDB } from './config/db'
import User from './models/User'
import Baseline from './models/Baseline'
import DailyLog from './models/DailyLog'
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

/** Add random jitter to a base value */
function jitter(base: number, range: number, min = 0, max = 10): number {
  return clamp(base + (Math.random() * range * 2 - range), min, max)
}

function pickBedtime(base: string, jitterMins: number): string {
  const [h, m] = base.split(':').map(Number)
  const totalMins = h * 60 + m + Math.round((Math.random() - 0.5) * jitterMins * 2)
  const clamped = ((totalMins % 1440) + 1440) % 1440
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

function pickWakeTime(base: string, jitterMins: number): string {
  return pickBedtime(base, jitterMins)
}

interface LogDay {
  pain: number; fatigue: number; breath: number; func: number
  sleep: number; quality: number; bed: string; wake: string
  flags: { chest?: boolean; fever?: boolean; meds?: boolean }
  notes: string
}

// ── User Definitions ─────────────────────────────────────

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
    primaryCondition: string; conditionDurationMonths: number
    painLevel: number; fatigueLevel: number
    breathingDifficulty: number; functionalLimitation: number
    sleepHours: number; sleepQuality: number
    usualBedtime: string; usualWakeTime: string
  }
  totalDays: number
  generateLogs: (baseline: UserSeed['baseline']) => LogDay[]
}

// ── Disease-specific log generators ──────────────────────

/**
 * USER 1: Sarah — Systemic Lupus Erythematosus (SLE), 90 days
 *
 * SLE is an autoimmune disease with unpredictable flare-remission cycles.
 * Flares often triggered by UV exposure, stress, infection, or missed meds.
 * Pattern: stable → gradual onset → flare peak → slow recovery, repeating.
 * Dominant symptoms: fatigue, joint pain, occasionally breathing (pleuritis).
 */
function generateSLE(b: UserSeed['baseline']): LogDay[] {
  const logs: LogDay[] = []

  for (let day = 0; day < 90; day++) {
    let pain = b.painLevel, fatigue = b.fatigueLevel
    let breath = b.breathingDifficulty, func = b.functionalLimitation
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    // Phase 1: Stable (days 0-18)
    if (day < 19) {
      pain = jitter(b.painLevel, 1)
      fatigue = jitter(b.fatigueLevel, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 5) notes = 'Good day, went for a short walk.'
      if (day === 12) notes = 'Mild joint stiffness in the morning.'
      if (day === 16) notes = 'Spent some time outdoors, wore sunscreen.'
    }
    // Phase 2: Flare buildup (days 19-24)
    else if (day < 25) {
      const ramp = (day - 19) / 5
      pain = clamp(b.painLevel + Math.round(ramp * 4), 0, 10)
      fatigue = clamp(b.fatigueLevel + Math.round(ramp * 4), 0, 10)
      breath = clamp(b.breathingDifficulty + Math.round(ramp * 2), 0, 10)
      func = clamp(b.functionalLimitation + Math.round(ramp * 3), 0, 10)
      sleep = clamp(b.sleepHours - Math.round(ramp * 2), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(ramp * 1.5), 1, 5)
      if (day === 20) notes = 'Joints aching more than usual.'
      if (day === 22) notes = 'Very tired, skipped evening plans.'
      if (day === 23) { flags.meds = true; notes = 'Missed morning dose of HCQ.' }
      if (day === 24) notes = 'Butterfly rash appearing on cheeks.'
    }
    // Phase 3: Flare peak (days 25-31)
    else if (day < 32) {
      pain = jitter(8, 1)
      fatigue = jitter(9, 0.5)
      breath = jitter(5, 1)
      func = jitter(7, 1)
      sleep = jitter(4, 0.5, 3, 12)
      quality = jitter(1, 0.5, 1, 5)
      if (day === 25) { flags.fever = true; notes = 'Fever 38.4C overnight. Called rheumatologist.' }
      if (day === 27) { flags.fever = true; notes = 'Fever persists. Started prednisone burst.' }
      if (day === 28) { flags.meds = true; notes = 'New medication: Prednisone 40mg taper.' }
      if (day === 30) notes = 'Fever broke, still very weak.'
    }
    // Phase 4: Recovery (days 32-45)
    else if (day < 46) {
      const recover = (day - 32) / 13
      pain = clamp(8 - Math.round(recover * 4), 0, 10)
      fatigue = clamp(9 - Math.round(recover * 4), 0, 10)
      breath = clamp(5 - Math.round(recover * 3), 0, 10)
      func = clamp(7 - Math.round(recover * 4), 0, 10)
      sleep = clamp(4 + Math.round(recover * 3), 3, 12)
      quality = clamp(1 + Math.round(recover * 2), 1, 5)
      if (day === 35) notes = 'Slowly improving. Tapering prednisone.'
      if (day === 40) notes = 'Managed light housework today.'
      if (day === 44) notes = 'Almost back to baseline.'
    }
    // Phase 5: Second stable (days 46-64)
    else if (day < 65) {
      pain = jitter(b.painLevel, 1)
      fatigue = jitter(b.fatigueLevel + 1, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 50) notes = 'Feeling much more like myself.'
      if (day === 58) notes = 'Good energy today, cooked dinner.'
    }
    // Phase 6: Minor flare (days 65-72)
    else if (day < 73) {
      const ramp = Math.sin(((day - 65) / 7) * Math.PI)
      pain = clamp(b.painLevel + Math.round(ramp * 2), 0, 10)
      fatigue = clamp(b.fatigueLevel + Math.round(ramp * 2), 0, 10)
      breath = jitter(b.breathingDifficulty, 1)
      func = clamp(b.functionalLimitation + Math.round(ramp * 2), 0, 10)
      sleep = clamp(b.sleepHours - Math.round(ramp * 1), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(ramp * 1), 1, 5)
      if (day === 68) notes = 'Stress at work, joints flaring up.'
      if (day === 70) notes = 'Mild flare, manageable with rest.'
    }
    // Phase 7: Return to stable (days 73-89)
    else {
      pain = jitter(b.painLevel, 1)
      fatigue = jitter(b.fatigueLevel, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 80) notes = 'Good week. Follow-up labs look stable.'
      if (day === 87) notes = 'Feeling well, maintaining routine.'
    }

    logs.push({
      pain, fatigue, breath, func, sleep, quality,
      bed: pickBedtime(b.usualBedtime, day >= 25 && day < 32 ? 60 : 30),
      wake: pickWakeTime(b.usualWakeTime, 30),
      flags, notes,
    })
  }
  return logs
}

/**
 * USER 2: Marcus — Pulmonary Arterial Hypertension (PAH), 60 days
 *
 * PAH is progressive elevated pressure in pulmonary arteries.
 * Dominant symptom: breathing difficulty, exercise intolerance, fatigue.
 * Pain is low unless right heart failure develops.
 * Pattern: gradually worsening breathing → new medication → stabilization.
 */
function generatePAH(b: UserSeed['baseline']): LogDay[] {
  const logs: LogDay[] = []

  for (let day = 0; day < 60; day++) {
    let pain = b.painLevel, fatigue = b.fatigueLevel
    let breath = b.breathingDifficulty, func = b.functionalLimitation
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    // Phase 1: Stable but gradually worsening (days 0-20)
    if (day < 21) {
      const drift = day / 20 * 2
      pain = jitter(b.painLevel, 0.5)
      fatigue = clamp(b.fatigueLevel + Math.round(drift * 0.8), 0, 10)
      breath = clamp(b.breathingDifficulty + Math.round(drift), 0, 10)
      func = clamp(b.functionalLimitation + Math.round(drift * 0.6), 0, 10)
      sleep = clamp(b.sleepHours - Math.round(drift * 0.3), 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 7) notes = 'Slightly more winded on stairs.'
      if (day === 14) notes = 'Had to rest halfway through grocery run.'
      if (day === 18) notes = 'Noticed ankles swelling in evening.'
    }
    // Phase 2: Worsening episode (days 21-32)
    else if (day < 33) {
      const severity = Math.sin(((day - 21) / 11) * Math.PI)
      pain = jitter(b.painLevel + 1, 1)
      fatigue = clamp(b.fatigueLevel + 2 + Math.round(severity * 3), 0, 10)
      breath = clamp(b.breathingDifficulty + 2 + Math.round(severity * 3), 0, 10)
      func = clamp(b.functionalLimitation + 2 + Math.round(severity * 3), 0, 10)
      sleep = clamp(b.sleepHours - 1 - Math.round(severity), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(severity * 1.5), 1, 5)
      if (day === 22) notes = 'Shortness of breath at rest now.'
      if (day === 25) { flags.chest = true; notes = 'Chest tightness, went to ER.' }
      if (day === 26) { flags.meds = true; notes = 'Started Sildenafil. Admitted overnight.' }
      if (day === 28) notes = 'Discharged. Oxygen sat improved.'
      if (day === 31) notes = 'Still adjusting to new medication.'
    }
    // Phase 3: Medication response (days 33-45)
    else if (day < 46) {
      const recover = (day - 33) / 12
      pain = jitter(b.painLevel, 0.5)
      fatigue = clamp(b.fatigueLevel + 3 - Math.round(recover * 3), 0, 10)
      breath = clamp(b.breathingDifficulty + 4 - Math.round(recover * 3.5), 0, 10)
      func = clamp(b.functionalLimitation + 3 - Math.round(recover * 2.5), 0, 10)
      sleep = clamp(b.sleepHours - 1 + Math.round(recover * 1.5), 3, 12)
      quality = clamp(b.sleepQuality - 1 + Math.round(recover * 1.5), 1, 5)
      if (day === 36) notes = 'Breathing noticeably better on Sildenafil.'
      if (day === 42) notes = 'Walked 10 minutes without stopping.'
    }
    // Phase 4: New stable (days 46-59)
    else {
      pain = jitter(b.painLevel, 0.5)
      fatigue = jitter(b.fatigueLevel + 1, 1)
      breath = jitter(b.breathingDifficulty + 1, 1)
      func = jitter(b.functionalLimitation + 1, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 50) notes = 'Stable. Pulmonologist pleased with progress.'
      if (day === 56) notes = 'Managed a full day out with family.'
    }

    logs.push({
      pain, fatigue, breath, func, sleep, quality,
      bed: pickBedtime(b.usualBedtime, 30),
      wake: pickWakeTime(b.usualWakeTime, 30),
      flags, notes,
    })
  }
  return logs
}

/**
 * USER 3: Priya — Hypermobile Ehlers-Danlos Syndrome (hEDS), 90 days
 *
 * hEDS is a connective tissue disorder causing joint hypermobility, chronic pain,
 * and fatigue. Highly variable day-to-day. Flares triggered by physical overexertion,
 * weather changes, hormonal cycles. Pain and functional limitation dominant.
 * Breathing usually not affected. Sleep disrupted by pain.
 */
function generateEDS(b: UserSeed['baseline']): LogDay[] {
  const logs: LogDay[] = []

  for (let day = 0; day < 90; day++) {
    // EDS has high day-to-day variability
    const randomBad = Math.random()
    let pain: number, fatigue: number, breath: number, func: number
    let sleep: number, quality: number
    let flags: LogDay['flags'] = {}
    let notes = ''

    // Cluster flare pattern every ~20 days (days 15-20, 38-44, 60-66)
    const inFlareCluster =
      (day >= 15 && day < 21) ||
      (day >= 38 && day < 45) ||
      (day >= 60 && day < 67)

    if (inFlareCluster) {
      pain = jitter(b.painLevel + 3, 1)
      fatigue = jitter(b.fatigueLevel + 2, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation + 3, 1)
      sleep = jitter(b.sleepHours - 1.5, 0.5, 3, 12)
      quality = jitter(b.sleepQuality - 1, 0.5, 1, 5)
      if (day === 16) notes = 'Multiple joint subluxations today.'
      if (day === 19) notes = 'Knee gave out on stairs. Using brace.'
      if (day === 39) notes = 'Weather changed, everything hurts.'
      if (day === 42) notes = 'Cannot grip anything, hands are bad.'
      if (day === 61) notes = 'Hormonal flare, whole body aching.'
      if (day === 65) notes = 'Hip subluxed twice today.'
    }
    // Random bad days (~15% chance outside clusters)
    else if (randomBad < 0.15) {
      pain = jitter(b.painLevel + 2, 1)
      fatigue = jitter(b.fatigueLevel + 1, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation + 2, 1)
      sleep = jitter(b.sleepHours - 1, 0.5, 3, 12)
      quality = jitter(b.sleepQuality - 1, 0.5, 1, 5)
      const badNotes = [
        'Overdid it yesterday, paying for it today.',
        'Shoulder popped out of place.',
        'Woke up with back spasms.',
        'Brain fog really bad today.',
      ]
      notes = badNotes[Math.floor(Math.random() * badNotes.length)]
    }
    // Random good days (~20% chance)
    else if (randomBad > 0.80) {
      pain = jitter(b.painLevel - 1, 0.5)
      fatigue = jitter(b.fatigueLevel - 1, 0.5)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation - 1, 0.5)
      sleep = jitter(b.sleepHours + 1, 0.5, 3, 12)
      quality = jitter(b.sleepQuality + 1, 0.5, 1, 5)
      const goodNotes = [
        'Actually a good day, got things done.',
        'Lower pain, managed a gentle swim.',
        'Slept well for once.',
        '',
      ]
      notes = goodNotes[Math.floor(Math.random() * goodNotes.length)]
    }
    // Normal days
    else {
      pain = jitter(b.painLevel, 1.5)
      fatigue = jitter(b.fatigueLevel, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation, 1.5)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
    }

    // Occasional missed meds
    if (day === 30 || day === 55) {
      flags.meds = true
      notes = day === 30
        ? 'Forgot pain medication, rough evening.'
        : 'Pharmacy delay, missed evening dose.'
    }

    logs.push({
      pain, fatigue, breath, func, sleep, quality,
      bed: pickBedtime(b.usualBedtime, inFlareCluster ? 60 : 30),
      wake: pickWakeTime(b.usualWakeTime, 30),
      flags, notes,
    })
  }
  return logs
}

/**
 * USER 4: James — Myasthenia Gravis, 45 days
 *
 * Autoimmune neuromuscular disease causing muscle weakness and fatigue.
 * Worsens with activity, improves with rest. Can affect breathing (crisis).
 * Dominant: fatigue, functional limitation. Pain is low.
 * Pattern: fluctuating weakness → exacerbation → IVIG treatment → recovery.
 */
function generateMG(b: UserSeed['baseline']): LogDay[] {
  const logs: LogDay[] = []

  for (let day = 0; day < 45; day++) {
    let pain = b.painLevel, fatigue = b.fatigueLevel
    let breath = b.breathingDifficulty, func = b.functionalLimitation
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    // Phase 1: Fluctuating baseline (days 0-12)
    if (day < 13) {
      // MG has diurnal variation - worse in evening
      pain = jitter(b.painLevel, 0.5)
      fatigue = jitter(b.fatigueLevel, 1.5)
      breath = jitter(b.breathingDifficulty, 1)
      func = jitter(b.functionalLimitation, 1.5)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 3) notes = 'Double vision brief episode this evening.'
      if (day === 8) notes = 'Difficulty swallowing at dinner.'
      if (day === 11) notes = 'Arms very weak by afternoon.'
    }
    // Phase 2: Exacerbation (days 13-22)
    else if (day < 23) {
      const ramp = Math.min((day - 13) / 6, 1)
      const peak = day >= 17 && day < 22
      pain = jitter(b.painLevel + 1, 0.5)
      fatigue = clamp(b.fatigueLevel + Math.round(ramp * 4) + (peak ? 1 : 0), 0, 10)
      breath = clamp(b.breathingDifficulty + Math.round(ramp * 3) + (peak ? 1 : 0), 0, 10)
      func = clamp(b.functionalLimitation + Math.round(ramp * 4) + (peak ? 1 : 0), 0, 10)
      sleep = clamp(b.sleepHours - Math.round(ramp * 2), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(ramp * 1.5), 1, 5)
      if (day === 14) notes = 'Drooping eyelids worse than usual.'
      if (day === 17) { flags.chest = true; notes = 'Breathing labored. Went to ER.' }
      if (day === 18) { flags.meds = true; notes = 'Started IVIG treatment in hospital.' }
      if (day === 19) notes = 'Day 2 of IVIG. Headache from infusion.'
      if (day === 21) notes = 'Discharged. Feeling slightly better.'
    }
    // Phase 3: Post-treatment recovery (days 23-35)
    else if (day < 36) {
      const recover = (day - 23) / 12
      pain = jitter(b.painLevel, 0.5)
      fatigue = clamp(b.fatigueLevel + 4 - Math.round(recover * 4), 0, 10)
      breath = clamp(b.breathingDifficulty + 3 - Math.round(recover * 3), 0, 10)
      func = clamp(b.functionalLimitation + 4 - Math.round(recover * 4), 0, 10)
      sleep = clamp(b.sleepHours - 1 + Math.round(recover * 1.5), 3, 12)
      quality = clamp(b.sleepQuality - 1 + Math.round(recover * 1.5), 1, 5)
      if (day === 26) notes = 'Swallowing easier now.'
      if (day === 30) notes = 'Can hold a book again without arms shaking.'
      if (day === 34) notes = 'IVIG really helped. Neurologist follow-up.'
    }
    // Phase 4: Near-baseline (days 36-44)
    else {
      pain = jitter(b.painLevel, 0.5)
      fatigue = jitter(b.fatigueLevel, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 38) notes = 'Good day, minimal ptosis.'
      if (day === 43) notes = 'Feeling strongest in weeks.'
    }

    logs.push({
      pain, fatigue, breath, func, sleep, quality,
      bed: pickBedtime(b.usualBedtime, 30),
      wake: pickWakeTime(b.usualWakeTime, 30),
      flags, notes,
    })
  }
  return logs
}

/**
 * USER 5: Elena — Systemic Sclerosis (Scleroderma), 30 days
 *
 * Autoimmune disease affecting skin, blood vessels, and organs.
 * Raynaud's phenomenon (cold triggers), skin tightening causes pain,
 * lung involvement (ILD) causes breathing issues, fatigue from inflammation.
 * Pattern: cold weather → Raynaud's flare → gradual improvement with warming.
 */
function generateSSc(b: UserSeed['baseline']): LogDay[] {
  const logs: LogDay[] = []

  for (let day = 0; day < 30; day++) {
    let pain = b.painLevel, fatigue = b.fatigueLevel
    let breath = b.breathingDifficulty, func = b.functionalLimitation
    let sleep = b.sleepHours, quality = b.sleepQuality
    let flags: LogDay['flags'] = {}
    let notes = ''

    // Phase 1: Baseline learning (days 0-8)
    if (day < 9) {
      pain = jitter(b.painLevel, 1)
      fatigue = jitter(b.fatigueLevel, 1)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = jitter(b.functionalLimitation, 1)
      sleep = jitter(b.sleepHours, 0.5, 3, 12)
      quality = jitter(b.sleepQuality, 0.5, 1, 5)
      if (day === 2) notes = 'Getting used to tracking symptoms.'
      if (day === 5) notes = 'Fingers stiff in the morning as usual.'
      if (day === 8) notes = 'Skin feels tighter on forearms.'
    }
    // Phase 2: Cold weather Raynaud's flare (days 9-18)
    else if (day < 19) {
      const severity = Math.sin(((day - 9) / 9) * Math.PI)
      pain = clamp(b.painLevel + Math.round(severity * 3), 0, 10)
      fatigue = clamp(b.fatigueLevel + Math.round(severity * 2), 0, 10)
      breath = clamp(b.breathingDifficulty + Math.round(severity * 1.5), 0, 10)
      func = clamp(b.functionalLimitation + Math.round(severity * 3), 0, 10)
      sleep = clamp(b.sleepHours - Math.round(severity * 1.5), 3, 12)
      quality = clamp(b.sleepQuality - Math.round(severity), 1, 5)
      if (day === 10) notes = 'Cold snap. Fingers turning white and blue.'
      if (day === 12) notes = 'Digital ulcer on right index finger.'
      if (day === 13) { flags.fever = true; notes = 'Low fever, ulcer may be infected.' }
      if (day === 14) { flags.meds = true; notes = 'Started Nifedipine for Raynaud\'s.' }
      if (day === 16) notes = 'Fingers slightly less cold. Nifedipine helping.'
    }
    // Phase 3: Gradual improvement (days 19-29)
    else {
      const recover = (day - 19) / 10
      pain = clamp(b.painLevel + 2 - Math.round(recover * 2), 0, 10)
      fatigue = clamp(b.fatigueLevel + 1 - Math.round(recover * 1), 0, 10)
      breath = jitter(b.breathingDifficulty, 0.5)
      func = clamp(b.functionalLimitation + 2 - Math.round(recover * 2), 0, 10)
      sleep = clamp(b.sleepHours - 1 + Math.round(recover), 3, 12)
      quality = clamp(b.sleepQuality - 1 + Math.round(recover), 1, 5)
      if (day === 22) notes = 'Warming up outside. Hands much better.'
      if (day === 25) notes = 'Digital ulcer healing well.'
      if (day === 28) notes = 'Nearly back to normal. Keep wearing gloves.'
    }

    logs.push({
      pain, fatigue, breath, func, sleep, quality,
      bed: pickBedtime(b.usualBedtime, 30),
      wake: pickWakeTime(b.usualWakeTime, 30),
      flags, notes,
    })
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
      age: 32, heightCm: 165, weightKg: 58,
      bloodGroup: 'A+',
      allergies: 'Sulfa drugs',
      currentMedications: 'Hydroxychloroquine 200mg BID, Folic acid 5mg daily',
    },
    baseline: {
      primaryCondition: 'Systemic Lupus Erythematosus (SLE)',
      conditionDurationMonths: 48,
      painLevel: 4, fatigueLevel: 5, breathingDifficulty: 2, functionalLimitation: 3,
      sleepHours: 7, sleepQuality: 3, usualBedtime: '23:00', usualWakeTime: '07:00',
    },
    totalDays: 90,
    generateLogs: generateSLE,
  },
  {
    username: 'marcus',
    email: 'marcus@hackrare.com',
    password: 'marcus123',
    profile: {
      age: 45, heightCm: 180, weightKg: 82,
      bloodGroup: 'O-',
      allergies: 'None',
      currentMedications: 'Ambrisentan 10mg daily, Warfarin 5mg daily',
    },
    baseline: {
      primaryCondition: 'Pulmonary Arterial Hypertension (PAH)',
      conditionDurationMonths: 24,
      painLevel: 2, fatigueLevel: 4, breathingDifficulty: 5, functionalLimitation: 4,
      sleepHours: 6, sleepQuality: 3, usualBedtime: '22:30', usualWakeTime: '06:30',
    },
    totalDays: 60,
    generateLogs: generatePAH,
  },
  {
    username: 'priya',
    email: 'priya@hackrare.com',
    password: 'priya123',
    profile: {
      age: 27, heightCm: 160, weightKg: 52,
      bloodGroup: 'B+',
      allergies: 'NSAIDs (GI intolerance)',
      currentMedications: 'Duloxetine 60mg daily, Magnesium glycinate 400mg',
    },
    baseline: {
      primaryCondition: 'Hypermobile Ehlers-Danlos Syndrome (hEDS)',
      conditionDurationMonths: 72,
      painLevel: 5, fatigueLevel: 4, breathingDifficulty: 1, functionalLimitation: 4,
      sleepHours: 6, sleepQuality: 2, usualBedtime: '00:00', usualWakeTime: '08:00',
    },
    totalDays: 90,
    generateLogs: generateEDS,
  },
  {
    username: 'james',
    email: 'james@hackrare.com',
    password: 'james123',
    profile: {
      age: 55, heightCm: 175, weightKg: 78,
      bloodGroup: 'AB+',
      allergies: 'Penicillin',
      currentMedications: 'Pyridostigmine 60mg TID, Mycophenolate 1000mg BID',
    },
    baseline: {
      primaryCondition: 'Myasthenia Gravis',
      conditionDurationMonths: 18,
      painLevel: 2, fatigueLevel: 6, breathingDifficulty: 3, functionalLimitation: 5,
      sleepHours: 7, sleepQuality: 3, usualBedtime: '22:00', usualWakeTime: '06:00',
    },
    totalDays: 45,
    generateLogs: generateMG,
  },
  {
    username: 'elena',
    email: 'elena@hackrare.com',
    password: 'elena123',
    profile: {
      age: 40, heightCm: 168, weightKg: 60,
      bloodGroup: 'A-',
      allergies: 'Latex',
      currentMedications: 'Mycophenolate 500mg BID, Omeprazole 20mg daily',
    },
    baseline: {
      primaryCondition: 'Systemic Sclerosis (Scleroderma)',
      conditionDurationMonths: 30,
      painLevel: 4, fatigueLevel: 5, breathingDifficulty: 4, functionalLimitation: 3,
      sleepHours: 6, sleepQuality: 3, usualBedtime: '23:30', usualWakeTime: '07:30',
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
      await User.deleteOne({ _id: existing._id })
    }
  }
  // Also clean old demo user
  const oldDemo = await User.findOne({ email: 'demo@hackrare.com' })
  if (oldDemo) {
    await DailyLog.deleteMany({ userId: oldDemo._id })
    await Baseline.deleteMany({ userId: oldDemo._id })
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
      profile: { ...u.profile, completedAt: new Date().toISOString() },
    })

    // Create baseline
    const baselineDateStr = dateStr(u.totalDays)
    await Baseline.create({
      userId: user._id,
      ...u.baseline,
      baselineDate: baselineDateStr,
    })

    // Generate and insert logs
    const logDays = u.generateLogs(u.baseline)
    const baselineSymptoms = {
      painLevel: u.baseline.painLevel,
      fatigueLevel: u.baseline.fatigueLevel,
      breathingDifficulty: u.baseline.breathingDifficulty,
      functionalLimitation: u.baseline.functionalLimitation,
    }

    let logCount = 0
    for (let i = 0; i < logDays.length; i++) {
      const l = logDays[i]
      const logDateStr = dateStr(u.totalDays - i)

      const logSymptoms = {
        painLevel: l.pain,
        fatigueLevel: l.fatigue,
        breathingDifficulty: l.breath,
        functionalLimitation: l.func,
      }

      const { perMetric, total } = calculateDeviation(logSymptoms, baselineSymptoms)
      const redFlags = {
        chestPainWeaknessConfusion: !!l.flags.chest,
        feverSweatsChills: !!l.flags.fever,
        missedOrNewMedication: !!l.flags.meds,
      }
      const flareRiskLevel = calculateFlareRisk(total, perMetric, redFlags)

      await DailyLog.create({
        userId: user._id,
        date: logDateStr,
        painLevel: l.pain,
        fatigueLevel: l.fatigue,
        breathingDifficulty: l.breath,
        functionalLimitation: l.func,
        redFlags,
        sleepHours: l.sleep,
        sleepQuality: l.quality,
        bedtime: l.bed,
        wakeTime: l.wake,
        notes: l.notes,
        deviationScore: total,
        flareRiskLevel,
      })
      logCount++
    }

    console.log(`[${u.username}] ${u.baseline.primaryCondition}`)
    console.log(`  Login: ${u.email} / ${u.password}`)
    console.log(`  Baseline: ${baselineDateStr} (${u.baseline.conditionDurationMonths} months)`)
    console.log(`  Logs: ${logCount} days`)
    console.log()
  }

  console.log('=== All Seed Accounts ===')
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

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
