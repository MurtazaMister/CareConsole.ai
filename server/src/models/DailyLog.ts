import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDailyLog extends Document {
  userId: Types.ObjectId
  date: string
  painLevel: number
  fatigueLevel: number
  breathingDifficulty: number
  functionalLimitation: number
  redFlags: {
    chestPainWeaknessConfusion: boolean
    feverSweatsChills: boolean
    missedOrNewMedication: boolean
  }
  sleepHours: number
  sleepQuality: number
  bedtime: string
  wakeTime: string
  notes: string
  deviationScore: number
  flareRiskLevel: 'low' | 'medium' | 'high'
  createdAt: Date
}

const DailyLogSchema = new Schema<IDailyLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  painLevel: { type: Number, required: true, min: 0, max: 10 },
  fatigueLevel: { type: Number, required: true, min: 0, max: 10 },
  breathingDifficulty: { type: Number, required: true, min: 0, max: 10 },
  functionalLimitation: { type: Number, required: true, min: 0, max: 10 },
  redFlags: {
    chestPainWeaknessConfusion: { type: Boolean, default: false },
    feverSweatsChills: { type: Boolean, default: false },
    missedOrNewMedication: { type: Boolean, default: false },
  },
  sleepHours: { type: Number, required: true, min: 0, max: 24 },
  sleepQuality: { type: Number, required: true, min: 1, max: 5 },
  bedtime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  wakeTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  notes: { type: String, default: '' },
  deviationScore: { type: Number, required: true },
  flareRiskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true })
DailyLogSchema.index({ userId: 1, date: -1 })

export default mongoose.model<IDailyLog>('DailyLog', DailyLogSchema)
