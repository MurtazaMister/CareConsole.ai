import { useAuth } from '../hooks/useAuth'
import PatientDashboard from './PatientDashboard'
import DoctorDashboard from './DoctorDashboard'

export default function Dashboard() {
  const { currentUser } = useAuth()

  if (currentUser?.role === 'doctor') {
    return <DoctorDashboard />
  }

  return <PatientDashboard />
}
