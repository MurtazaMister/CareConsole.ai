import { createContext } from 'react'
import type { UserProfile, UserRole } from '../types/user'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: UserRole
  profile: UserProfile | null
  createdAt: string
}

export interface AuthContextType {
  currentUser: AuthUser | null
  profile: UserProfile | null
  isAuthenticated: boolean
  isProfileComplete: boolean
  loading: boolean
  signup: (username: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  saveProfile: (profile: UserProfile) => Promise<{ success: boolean; error?: string }>
}

export const AuthContext = createContext<AuthContextType | null>(null)
