import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { requireDoctor } from '../middleware/requireRole'
import { getClients, addClient, removeClient, getClientData } from '../controllers/doctorController'

const router = Router()

// All doctor routes require doctor role
router.use(requireDoctor)

router.get('/clients', asyncHandler(getClients))
router.post('/clients', asyncHandler(addClient))
router.delete('/clients/:patientId', asyncHandler(removeClient))
router.get('/clients/:patientId/data', asyncHandler(getClientData))

export default router
