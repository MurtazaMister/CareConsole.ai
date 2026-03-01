import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

interface RequireAuthProps {
  children: ReactNode
  requireProfile?: boolean
}

export default function RequireAuth({ children, requireProfile }: RequireAuthProps) {
  const { isAuthenticated, isProfileComplete, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (requireProfile && !isProfileComplete) {
    return <Navigate to="/profile-setup" replace />
  }

  return <>{children}</>
}
