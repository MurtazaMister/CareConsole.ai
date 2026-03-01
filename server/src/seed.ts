import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { connectDB } from './config/db'
import User from './models/User'
import Baseline from './models/Baseline'
import DailyLog from './models/DailyLog'
import { calculateDeviation, calculateFlareRisk } from './utils/flareLogic'

async function seed() {
  await connectDB()

  const email = 'demo@hackrare.com'
  const password = 'demo1234'
  const username = 'demo_user'

  // Clean up existing demo user
  const existing = await User.findOne({ email })
  if (existing) {
    await DailyLog.deleteMany({ userId: existing._id })
    await Baseline.deleteMany({ userId: existing._id })
    await User.deleteOne({ _id: existing._id })
    console.log('Cleaned up existing demo user')
  }

  // Create user with profile
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    profile: {
      age: 28,
      heightCm: 170,
      weightKg: 65,
      bloodGroup: 'O+',
      allergies: 'Penicillin, Pollen',
      currentMedications: 'Hydroxychloroquine 200mg daily, Folic acid 5mg daily',
      completedAt: new Date().toISOString(),
    },
  })
  console.log('Created user:', username, '/', email)

  // Create baseline (14 days ago)
  const baselineDate = new Date()
  baselineDate.setDate(baselineDate.getDate() - 14)
  const baselineDateStr = baselineDate.toISOString().split('T')[0]

  const baselineData = {
    userId: user._id,
    primaryCondition: 'Systemic Lupus Erythematosus (SLE)',
    conditionDurationMonths: 36,
    baselineDate: baselineDateStr,
    painLevel: 4,
    fatigueLevel: 5,
    breathingDifficulty: 2,
    functionalLimitation: 3,
    sleepHours: 7,
    sleepQuality: 3,
    usualBedtime: '23:00',
    usualWakeTime: '07:00',
  }

  const baseline = await Baseline.create(baselineData)
  console.log('Created baseline (date:', baselineDateStr, ')')

  // Generate 14 days of logs with realistic patterns
  // Simulate a mild flare building up around days 8-10, then recovering
  const logPatterns = [
    // Day 1-3: Near baseline, stable
    { pain: 4, fatigue: 5, breath: 2, func: 3, sleep: 7, quality: 3, bed: '23:00', wake: '07:00', flags: {}, notes: 'Feeling about normal today.' },
    { pain: 3, fatigue: 4, breath: 2, func: 3, sleep: 7, quality: 4, bed: '22:30', wake: '06:30', flags: {}, notes: 'Good day, managed a short walk.' },
    { pain: 4, fatigue: 5, breath: 2, func: 3, sleep: 6, quality: 3, bed: '23:30', wake: '07:00', flags: {}, notes: '' },
    // Day 4-5: Slight uptick
    { pain: 5, fatigue: 5, breath: 3, func: 4, sleep: 6, quality: 2, bed: '00:00', wake: '07:00', flags: {}, notes: 'Joints a bit stiff this morning.' },
    { pain: 5, fatigue: 6, breath: 2, func: 4, sleep: 6, quality: 3, bed: '23:00', wake: '06:30', flags: {}, notes: 'Fatigue worse than usual.' },
    // Day 6-7: Getting worse
    { pain: 6, fatigue: 7, breath: 3, func: 5, sleep: 5, quality: 2, bed: '23:30', wake: '06:00', flags: {}, notes: 'Had to skip evening plans due to fatigue.' },
    { pain: 6, fatigue: 7, breath: 3, func: 5, sleep: 5, quality: 2, bed: '00:00', wake: '06:30', flags: { missedOrNewMedication: true }, notes: 'Missed morning dose of HCQ.' },
    // Day 8-10: Flare peak
    { pain: 8, fatigue: 8, breath: 4, func: 7, sleep: 4, quality: 1, bed: '01:00', wake: '06:00', flags: { feverSweatsChills: true }, notes: 'Low-grade fever overnight. Called rheumatologist.' },
    { pain: 7, fatigue: 8, breath: 4, func: 6, sleep: 5, quality: 2, bed: '23:00', wake: '06:00', flags: {}, notes: 'Fever broke. Still very fatigued.' },
    { pain: 7, fatigue: 7, breath: 3, func: 6, sleep: 5, quality: 2, bed: '23:00', wake: '06:30', flags: {}, notes: 'Doctor adjusted meds. Resting.' },
    // Day 11-14: Recovery
    { pain: 6, fatigue: 6, breath: 3, func: 5, sleep: 6, quality: 3, bed: '23:00', wake: '07:00', flags: {}, notes: 'Slowly improving.' },
    { pain: 5, fatigue: 6, breath: 2, func: 4, sleep: 7, quality: 3, bed: '22:30', wake: '06:30', flags: {}, notes: 'Better today. Managed light housework.' },
    { pain: 5, fatigue: 5, breath: 2, func: 3, sleep: 7, quality: 4, bed: '22:30', wake: '06:30', flags: {}, notes: 'Almost back to normal.' },
    { pain: 4, fatigue: 5, breath: 2, func: 3, sleep: 7, quality: 3, bed: '23:00', wake: '07:00', flags: {}, notes: 'Feeling good. Follow-up with doctor tomorrow.' },
  ]

  const baselineSymptoms = {
    painLevel: baselineData.painLevel,
    fatigueLevel: baselineData.fatigueLevel,
    breathingDifficulty: baselineData.breathingDifficulty,
    functionalLimitation: baselineData.functionalLimitation,
  }

  for (let i = 0; i < logPatterns.length; i++) {
    const pattern = logPatterns[i]
    const logDate = new Date(baselineDate)
    logDate.setDate(logDate.getDate() + i)
    const dateStr = logDate.toISOString().split('T')[0]

    const logSymptoms = {
      painLevel: pattern.pain,
      fatigueLevel: pattern.fatigue,
      breathingDifficulty: pattern.breath,
      functionalLimitation: pattern.func,
    }

    const { perMetric, total } = calculateDeviation(logSymptoms, baselineSymptoms)
    const flareRiskLevel = calculateFlareRisk(total, perMetric, {
      chestPainWeaknessConfusion: !!pattern.flags.chestPainWeaknessConfusion,
      feverSweatsChills: !!pattern.flags.feverSweatsChills,
      missedOrNewMedication: !!pattern.flags.missedOrNewMedication,
    })

    await DailyLog.create({
      userId: user._id,
      date: dateStr,
      painLevel: pattern.pain,
      fatigueLevel: pattern.fatigue,
      breathingDifficulty: pattern.breath,
      functionalLimitation: pattern.func,
      redFlags: {
        chestPainWeaknessConfusion: !!pattern.flags.chestPainWeaknessConfusion,
        feverSweatsChills: !!pattern.flags.feverSweatsChills,
        missedOrNewMedication: !!pattern.flags.missedOrNewMedication,
      },
      sleepHours: pattern.sleep,
      sleepQuality: pattern.quality,
      bedtime: pattern.bed,
      wakeTime: pattern.wake,
      notes: pattern.notes,
      deviationScore: total,
      flareRiskLevel,
    })

    console.log(`  Log ${dateStr}: deviation=${total}, risk=${flareRiskLevel}`)
  }

  console.log('\n=== Demo Account Ready ===')
  console.log('Email:    demo@hackrare.com')
  console.log('Password: demo1234')
  console.log(`Baseline: ${baselineDateStr} (Lupus, 3 years)`)
  console.log(`Logs:     ${logPatterns.length} days of data`)
  console.log('==========================\n')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
