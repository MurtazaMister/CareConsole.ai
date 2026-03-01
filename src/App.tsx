import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { BaselineProvider } from './context/BaselineProvider'
import { SchemaProvider } from './context/SchemaProvider'
import { LogsProvider } from './context/LogsProvider'
import RequireAuth from './components/RequireAuth'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <AuthProvider>
      <BaselineProvider>
        <SchemaProvider>
        <LogsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile-setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
              <Route path="/onboarding" element={<RequireAuth requireProfile><Onboarding /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth requireProfile><Dashboard /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </LogsProvider>
        </SchemaProvider>
      </BaselineProvider>
    </AuthProvider>
  )
}

export default App
