import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { generateReport, explainFlareWindow } from '../controllers/aiController'

const router = Router()

router.post('/generate', asyncHandler(generateReport))
router.post('/explain-flare', asyncHandler(explainFlareWindow))

export default router
