import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ITransientCandidate {
  count: number
  firstSeen: string
  lastSeen: string
  label: string
}

export interface IUserSchema extends Document {
  userId: Types.ObjectId
  formSchema: object
  generatedAt: Date
  finalMetrics: string[]
  transientMetrics: string[]
  tombstoneMetrics: string[]
  transientCandidates: Map<string, ITransientCandidate>
  context: {
    disease: string
    notes: string
  }
}

const UserSchemaModel = new Schema<IUserSchema>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  formSchema: { type: Schema.Types.Mixed, required: true },
  generatedAt: { type: Date, default: Date.now },
  finalMetrics: { type: [String], default: [] },
  transientMetrics: { type: [String], default: [] },
  tombstoneMetrics: { type: [String], default: [] },
  transientCandidates: {
    type: Map,
    of: new Schema({
      count: { type: Number, default: 1 },
      firstSeen: { type: String, required: true },
      lastSeen: { type: String, required: true },
      label: { type: String, required: true },
    }, { _id: false }),
    default: new Map(),
  },
  context: {
    disease: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
})

UserSchemaModel.index({ userId: 1 }, { unique: true })

export default mongoose.model<IUserSchema>('UserSchema', UserSchemaModel)
