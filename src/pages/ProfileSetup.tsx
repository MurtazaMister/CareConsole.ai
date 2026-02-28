import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BLOOD_GROUPS } from '../types/user'
import type { BloodGroup, UserProfile } from '../types/user'

export default function ProfileSetup() {
  const navigate = useNavigate()
  const { profile, saveProfile, currentUser } = useAuth()

  const [age, setAge] = useState(profile?.age ?? 0)
  const [heightCm, setHeightCm] = useState(profile?.heightCm ?? 0)
  const [weightKg, setWeightKg] = useState(profile?.weightKg ?? 0)
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>(profile?.bloodGroup ?? '')
  const [allergies, setAllergies] = useState(profile?.allergies ?? '')
  const [medications, setMedications] = useState(profile?.currentMedications ?? '')

  const isValid = age > 0 && age <= 120 && heightCm > 0 && weightKg > 0 && bloodGroup !== ''

  const handleSubmit = () => {
    if (!isValid) return
    const p: UserProfile = {
      age,
      heightCm,
      weightKg,
      bloodGroup: bloodGroup as BloodGroup,
      allergies: allergies.trim(),
      currentMedications: medications.trim(),
      completedAt: profile?.completedAt ?? new Date().toISOString(),
    }
    saveProfile(p)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h1 className="text-lg font-semibold text-text">
            {profile ? 'Edit Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-text-muted text-xs mt-0.5">
            Hi {currentUser?.username ?? 'there'}! Just a few quick details before we begin.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-text mb-4">Basic Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age || ''}
                  onChange={(e) => setAge(Math.max(0, Math.min(120, Number(e.target.value))))}
                  placeholder="25"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <p className="text-[10px] text-text-muted text-center mt-1">years</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Height</label>
                <input
                  type="number"
                  min={30}
                  max={250}
                  value={heightCm || ''}
                  onChange={(e) => setHeightCm(Math.max(0, Number(e.target.value)))}
                  placeholder="170"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <p className="text-[10px] text-text-muted text-center mt-1">cm</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">Weight</label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={weightKg || ''}
                  onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
                  placeholder="70"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <p className="text-[10px] text-text-muted text-center mt-1">kg</p>
              </div>
            </div>
          </div>

          {/* Blood group */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-text mb-1">Blood Group</h3>
            <p className="text-xs text-text-muted mb-4">Select your blood type</p>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`py-3 rounded-xl text-center transition-all duration-200 border-2 font-bold text-sm ${
                    bloodGroup === bg
                      ? 'border-primary bg-primary/5 text-primary shadow-sm scale-105'
                      : 'border-border bg-white text-text-muted hover:border-gray-300 hover:bg-surface-dark'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Optional medical info */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-text mb-1">Medical Details</h3>
            <p className="text-xs text-text-muted mb-4">Optional — you can fill this in later</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Known Allergies <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value.slice(0, 300))}
                  placeholder="e.g. Penicillin, Shellfish, Pollen..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                />
                <p className="text-right text-[10px] text-text-muted mt-0.5">{allergies.length}/300</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Current Medications <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={medications}
                  onChange={(e) => setMedications(e.target.value.slice(0, 300))}
                  placeholder="e.g. Methotrexate 15mg weekly, Folic acid daily..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none transition-all"
                />
                <p className="text-right text-[10px] text-text-muted mt-0.5">{medications.length}/300</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                isValid
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {profile ? 'Save Changes' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
