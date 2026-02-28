import { useState, useCallback, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import type { UserAccount, UserProfile } from '../types/user'
import { validateEmail, validateUsername, validatePassword } from '../types/user'

const ACCOUNTS_KEY = 'hackrare-accounts'
const SESSION_KEY = 'hackrare-session'
const PROFILE_KEY = 'hackrare-profile'

function readAccounts(): UserAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function readSession(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

function readProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<UserAccount[]>(readAccounts)
  const [currentUserId, setCurrentUserId] = useState<string | null>(readSession)
  const [profile, setProfile] = useState<UserProfile | null>(readProfile)

  const currentUser = accounts.find((a) => a.id === currentUserId) ?? null

  const signup = useCallback(
    (username: string, email: string, password: string): { success: boolean; error?: string } => {
      if (!validateUsername(username)) {
        return { success: false, error: 'Username must be 3-30 characters (letters, numbers, underscores)' }
      }
      if (!validateEmail(email)) {
        return { success: false, error: 'Please enter a valid email address' }
      }
      if (!validatePassword(password)) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }

      const existing = readAccounts()
      if (existing.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, error: 'Username already taken' }
      }
      if (existing.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'Email already registered' }
      }

      const account: UserAccount = {
        id: crypto.randomUUID(),
        username,
        email: email.toLowerCase(),
        password,
        createdAt: new Date().toISOString(),
      }

      const updated = [...existing, account]
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated))
      localStorage.setItem(SESSION_KEY, account.id)
      localStorage.removeItem(PROFILE_KEY)
      setAccounts(updated)
      setCurrentUserId(account.id)
      setProfile(null)
      return { success: true }
    },
    [],
  )

  const login = useCallback(
    (identifier: string, password: string): { success: boolean; error?: string } => {
      const all = readAccounts()
      const lowerIdent = identifier.toLowerCase()
      const match = all.find(
        (a) =>
          (a.email.toLowerCase() === lowerIdent || a.username.toLowerCase() === lowerIdent) &&
          a.password === password,
      )
      if (!match) {
        return { success: false, error: 'Invalid credentials' }
      }
      localStorage.setItem(SESSION_KEY, match.id)
      setAccounts(all)
      setCurrentUserId(match.id)
      // Load profile for this user
      setProfile(readProfile())
      return { success: true }
    },
    [],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUserId(null)
    setProfile(null)
  }, [])

  const saveProfile = useCallback((p: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
    setProfile(p)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        isAuthenticated: currentUser !== null,
        isProfileComplete: profile !== null,
        signup,
        login,
        logout,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
