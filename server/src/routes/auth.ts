import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { authMiddleware } from '../middleware/auth'
import { signup, login, me, logout } from '../controllers/authController'

const router = Router()

router.post('/signup', asyncHandler(signup))
router.post('/login', asyncHandler(login))
router.get('/me', authMiddleware, asyncHandler(me))
router.post('/logout', logout)

export default router
