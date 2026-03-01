import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { getSchema, generateSchema } from '../controllers/schemaController'

const router = Router()

router.get('/', asyncHandler(getSchema))
router.post('/generate', asyncHandler(generateSchema))

export default router
