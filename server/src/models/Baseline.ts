import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IBaseline extends Document {
  userId: Types.ObjectId
  primaryCondition: string
  conditionDurationMonths: number
  baselineDate: string
  painLevel: number
  fatigueLevel: number
  breathingDifficulty: number
  functionalLimitation: number
  sleepHours: number
  sleepQuality: number
  usualBedtime: string
  usualWakeTime: string
  createdAt: Date
}

const BaselineSchema = new Schema<IBaseline>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  primaryCondition: { type: String, required: true },
  conditionDurationMonths: { type: Number, required: true, min: 0 },
  baselineDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  painLevel: { type: Number, required: true, min: 0, max: 10 },
  fatigueLevel: { type: Number, required: true, min: 0, max: 10 },
  breathingDifficulty: { type: Number, required: true, min: 0, max: 10 },
  functionalLimitation: { type: Number, required: true, min: 0, max: 10 },
  sleepHours: { type: Number, required: true, min: 0, max: 24 },
  sleepQuality: { type: Number, required: true, min: 1, max: 5 },
  usualBedtime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  usualWakeTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model<IBaseline>('Baseline', BaselineSchema)
