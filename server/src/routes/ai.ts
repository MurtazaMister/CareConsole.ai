import { Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../middleware/errorHandler'
import { generateReport, explainFlareWindow, cleanNotes, scanForm } from '../controllers/aiController'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/generate', asyncHandler(generateReport))
router.post('/explain-flare', asyncHandler(explainFlareWindow))
router.post('/clean-notes', asyncHandler(cleanNotes))
router.post('/scan-form', upload.single('formImage'), asyncHandler(scanForm))

export default router
