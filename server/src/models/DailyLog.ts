import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDailyLog extends Document {
  userId: Types.ObjectId
  date: string
  finalMetrics: string[]
  transientMetrics: string[]
  tombstoneMetrics: string[]
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
  responses: Map<string, unknown>
  deviationScore: number
  flareRiskLevel: 'low' | 'medium' | 'high'
  createdAt: Date
}

const DailyLogSchema = new Schema<IDailyLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  finalMetrics: { type: [String], default: [] },
  transientMetrics: { type: [String], default: [] },
  tombstoneMetrics: { type: [String], default: [] },
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
  responses: { type: Map, of: Schema.Types.Mixed, default: new Map() },
  deviationScore: { type: Number, default: 0 },
  flareRiskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
}, { timestamps: { createdAt: true, updatedAt: false } })

DailyLogSchema.index({ userId: 1, date: 1 }, { unique: true })
DailyLogSchema.index({ userId: 1, date: -1 })

export default mongoose.model<IDailyLog>('DailyLog', DailyLogSchema)
