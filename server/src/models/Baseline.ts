import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IBaseline extends Document {
  userId: Types.ObjectId
  primaryCondition: string
  conditionDurationMonths: number
  baselineDate: string
  finalMetrics: string[]
  sleepHours: number
  sleepQuality: number
  usualBedtime: string
  usualWakeTime: string
  responses: Map<string, unknown>
  createdAt: Date
}

const BaselineSchema = new Schema<IBaseline>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  primaryCondition: { type: String, required: true },
  conditionDurationMonths: { type: Number, required: true, min: 0 },
  baselineDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  finalMetrics: { type: [String], default: [] },
  sleepHours: { type: Number, required: true, min: 0, max: 24 },
  sleepQuality: { type: Number, required: true, min: 1, max: 5 },
  usualBedtime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  usualWakeTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  responses: { type: Map, of: Schema.Types.Mixed, default: new Map() },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model<IBaseline>('Baseline', BaselineSchema)
