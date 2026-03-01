import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { getLogs, createOrUpdateLog, getLogByDate, deleteLogByDate } from '../controllers/logsController'

const router = Router()

router.get('/', asyncHandler(getLogs))
router.post('/', asyncHandler(createOrUpdateLog))
router.get('/:date', asyncHandler(getLogByDate))
router.delete('/:date', asyncHandler(deleteLogByDate))

export default router
