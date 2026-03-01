import { createContext } from 'react'

// When a doctor views a patient, this holds the patient's ID.
// Null when a patient views their own data.
export const ViewingPatientContext = createContext<string | null>(null)
