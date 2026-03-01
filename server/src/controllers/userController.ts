import { Request, Response } from 'express'
import User from '../models/User'

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export async function updateProfile(req: Request, res: Response) {
  const { age, heightCm, weightKg, bloodGroup, allergies, currentMedications } = req.body

  if (!age || typeof age !== 'number' || age < 1 || age > 150) {
    res.status(400).json({ error: 'Age must be between 1 and 150' })
    return
  }
  if (!heightCm || typeof heightCm !== 'number' || heightCm < 30 || heightCm > 300) {
    res.status(400).json({ error: 'Height must be between 30 and 300 cm' })
    return
  }
  if (!weightKg || typeof weightKg !== 'number' || weightKg < 1 || weightKg > 500) {
    res.status(400).json({ error: 'Weight must be between 1 and 500 kg' })
    return
  }
  if (!bloodGroup || !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    res.status(400).json({ error: 'Invalid blood group' })
    return
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      profile: {
        age,
        heightCm,
        weightKg,
        bloodGroup,
        allergies: allergies || '',
        currentMedications: currentMedications || '',
        completedAt: new Date().toISOString(),
      },
    },
    { new: true },
  ).select('-password')

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ user })
}
