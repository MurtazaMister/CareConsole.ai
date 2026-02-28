import { createContext } from 'react'
import type { UserAccount, UserProfile } from '../types/user'

export interface AuthContextType {
  currentUser: UserAccount | null
  profile: UserProfile | null
  isAuthenticated: boolean
  isProfileComplete: boolean
  signup: (username: string, email: string, password: string) => { success: boolean; error?: string }
  login: (identifier: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  saveProfile: (profile: UserProfile) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)
