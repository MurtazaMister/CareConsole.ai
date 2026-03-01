import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { generateReport } from '../controllers/aiController'

const router = Router()

router.post('/generate', asyncHandler(generateReport))

export default router
