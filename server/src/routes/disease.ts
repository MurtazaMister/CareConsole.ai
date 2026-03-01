import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { lookupDisease, initializeSchema } from '../controllers/diseaseController'

const router = Router()

router.post('/lookup', asyncHandler(lookupDisease))
router.post('/initialize', asyncHandler(initializeSchema))

export default router
