import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { getBaseline, upsertBaseline } from '../controllers/baselineController'

const router = Router()

router.get('/', asyncHandler(getBaseline))
router.put('/', asyncHandler(upsertBaseline))

export default router
