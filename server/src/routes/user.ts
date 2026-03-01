import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { updateProfile } from '../controllers/userController'

const router = Router()

router.put('/profile', asyncHandler(updateProfile))

export default router
