import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { getLogs, createOrUpdateLog, getLogByDate } from '../controllers/logsController'

const router = Router()

router.get('/', asyncHandler(getLogs))
router.post('/', asyncHandler(createOrUpdateLog))
router.get('/:date', asyncHandler(getLogByDate))

export default router
