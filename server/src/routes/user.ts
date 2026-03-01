import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { updateProfile, deleteAccount } from '../controllers/userController'

const router = Router()

router.put('/profile', asyncHandler(updateProfile))
router.delete('/account', asyncHandler(deleteAccount))

export default router
