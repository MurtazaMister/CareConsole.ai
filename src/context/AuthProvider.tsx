import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import type { AuthUser } from './authContext'
import type { UserProfile, UserRole } from '../types/user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if we have a valid session via cookie
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const signup = useCallback(
    async (username: string, email: string, password: string, role?: UserRole): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, email, password, role: role ?? 'patient' }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Signup failed' }
        }
        setCurrentUser(data.user)
        return { success: true }
      } catch {
        return { success: false, error: 'Network error. Is the server running?' }
      }
    },
    [],
  )

  const login = useCallback(
    async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ identifier, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Login failed' }
        }
        setCurrentUser(data.user)
        return { success: true }
      } catch {
        return { success: false, error: 'Network error. Is the server running?' }
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // Logout locally even if server request fails
    }
    setCurrentUser(null)
  }, [])

  const saveProfile = useCallback(
    async (profile: UserProfile): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(profile),
        })
        const data = await res.json()
        if (!res.ok) {
          return { success: false, error: data.error || 'Failed to save profile' }
        }
        setCurrentUser(data.user)
        return { success: true }
      } catch {
        return { success: false, error: 'Network error. Is the server running?' }
      }
    },
    [],
  )

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete account' }))
        return { success: false, error: data.error || 'Failed to delete account' }
      }
      setCurrentUser(null)
      return { success: true }
    } catch {
      return { success: false, error: 'Network error. Is the server running?' }
    }
  }, [])

  const profile = currentUser?.profile ?? null

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        isAuthenticated: currentUser !== null,
        isProfileComplete: profile !== null,
        loading,
        signup,
        login,
        logout,
        saveProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
