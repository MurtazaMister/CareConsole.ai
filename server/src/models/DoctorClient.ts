import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDoctorClient extends Document {
  doctorId: Types.ObjectId
  patientId: Types.ObjectId
  addedAt: Date
}

const DoctorClientSchema = new Schema<IDoctorClient>({
  doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  addedAt: { type: Date, default: Date.now },
})

DoctorClientSchema.index({ doctorId: 1, patientId: 1 }, { unique: true })
DoctorClientSchema.index({ doctorId: 1 })

export default mongoose.model<IDoctorClient>('DoctorClient', DoctorClientSchema)
