import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BaselineProvider } from './context/BaselineProvider'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BaselineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </BrowserRouter>
    </BaselineProvider>
  )
}

export default App
