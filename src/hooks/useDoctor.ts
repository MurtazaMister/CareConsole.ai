import { useContext } from 'react'
import { DoctorContext } from '../context/DoctorProvider'

export function useDoctor() {
  const ctx = useContext(DoctorContext)
  if (!ctx) throw new Error('useDoctor must be used inside DoctorProvider')
  return ctx
}
