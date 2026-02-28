import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

interface RequireAuthProps {
  children: ReactNode
  requireProfile?: boolean
}

export default function RequireAuth({ children, requireProfile }: RequireAuthProps) {
  const { isAuthenticated, isProfileComplete } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (requireProfile && !isProfileComplete) {
    return <Navigate to="/profile-setup" replace />
  }

  return <>{children}</>
}
