// ── Roles ────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor'

// ── User Account (auth credentials) ─────────────────────

export interface UserAccount {
  id: string
  username: string
  email: string
  password: string // plaintext — prototype only, backend will handle hashing
  role: UserRole
  createdAt: string
}

// ── User Profile (medical/demographic) ──────────────────

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface UserProfile {
  age: number
  heightCm: number
  weightKg: number
  bloodGroup: BloodGroup
  allergies: string
  currentMedications: string
  completedAt: string
}

export const BLOOD_GROUPS: BloodGroup[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
]

// ── Validation ──────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username)
}

export function validatePassword(password: string): boolean {
  return password.length >= 6
}
