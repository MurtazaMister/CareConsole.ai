import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { generateReport, explainFlareWindow, cleanNotes } from '../controllers/aiController'

const router = Router()

router.post('/generate', asyncHandler(generateReport))
router.post('/explain-flare', asyncHandler(explainFlareWindow))
router.post('/clean-notes', asyncHandler(cleanNotes))

export default router
