import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { validateEmail, validateUsername, validatePassword } from '../types/user'

type Mode = 'login' | 'signup'

export default function Auth() {
  const { isAuthenticated, isProfileComplete, signup, login } = useAuth()
  const [mode, setMode] = useState<Mode>('signup')
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  // Signup fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Login fields
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  if (isAuthenticated && isProfileComplete) {
    return <Navigate to="/dashboard" replace />
  }
  if (isAuthenticated && !isProfileComplete) {
    return <Navigate to="/profile-setup" replace />
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setStep(0)
    setError('')
  }

  // Signup validation per step
  const canProceedStep0 = validateUsername(username) && validateEmail(email)
  const passwordsMatch = password === confirmPassword
  const canSignup = validatePassword(password) && passwordsMatch

  const handleSignup = () => {
    if (!canSignup) return
    const result = signup(username.trim(), email.trim(), password)
    if (!result.success) {
      setError(result.error ?? 'Signup failed')
    }
  }

  const handleLogin = () => {
    if (!loginId.trim() || !loginPassword) {
      setError('Please fill in all fields')
      return
    }
    const result = login(loginId.trim(), loginPassword)
    if (!result.success) {
      setError(result.error ?? 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-3xl">🩺</span>
          </div>
          <h1 className="text-2xl font-bold text-text">HackRare</h1>
          <p className="text-text-muted text-sm mt-1">Early flare detection for rare diseases</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface-dark rounded-xl p-1 mb-6">
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'signup' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'login' ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {/* ─── Signup Mode ─── */}
        {mode === 'signup' && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    i <= step ? 'bg-gradient-to-r from-primary to-accent' : 'bg-surface-dark'
                  }`}
                />
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">Let's get started</h2>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError('') }}
                    placeholder="e.g. john_doe"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  {username && !validateUsername(username) && (
                    <p className="text-xs text-red-500 mt-1">3-30 characters, letters, numbers, underscores only</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  {email && !validateEmail(email) && (
                    <p className="text-xs text-red-500 mt-1">Please enter a valid email</p>
                  )}
                </div>
                <button
                  onClick={() => { setError(''); setStep(1) }}
                  disabled={!canProceedStep0}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                    canProceedStep0
                      ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setStep(0)} className="text-text-muted hover:text-text transition-colors">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-lg font-semibold text-text">Set your password</h2>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  {password && !validatePassword(password) && (
                    <p className="text-xs text-red-500 mt-1">Minimum 6 characters</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                </div>
                <button
                  onClick={handleSignup}
                  disabled={!canSignup}
                  className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                    canSignup
                      ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Login Mode ─── */}
        {mode === 'login' && (
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-4">Welcome back</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Email or Username</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => { setLoginId(e.target.value); setError('') }}
                  placeholder="you@example.com or john_doe"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setError('') }}
                  placeholder="Your password"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                Log In
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-text-muted text-xs mt-6">
          Your data stays on this device. No server required.
        </p>
      </div>
    </div>
  )
}
