import mongoose, { Schema, Document } from 'mongoose'

export interface IUserProfile {
  age: number
  heightCm: number
  weightKg: number
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  allergies: string
  currentMedications: string
  completedAt: string
}

export type UserRole = 'patient' | 'doctor'

export interface IUser extends Document {
  username: string
  email: string
  password: string
  role: UserRole
  profile: IUserProfile | null
  createdAt: Date
}

const UserProfileSchema = new Schema<IUserProfile>({
  age: { type: Number, required: true },
  heightCm: { type: Number, required: true },
  weightKg: { type: Number, required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
  },
  allergies: { type: String, default: '' },
  currentMedications: { type: String, default: '' },
  completedAt: { type: String, required: true },
}, { _id: false })

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9_]{3,30}$/,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  profile: { type: UserProfileSchema, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model<IUser>('User', UserSchema)
