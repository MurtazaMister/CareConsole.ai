import { Request, Response, NextFunction } from 'express'
import User from '../models/User'

export function requireDoctor(req: Request, res: Response, next: NextFunction): void {
  User.findById(req.userId).select('role').lean().then((user) => {
    if (!user || user.role !== 'doctor') {
      res.status(403).json({ error: 'Doctor access required' })
      return
    }
    next()
  }).catch(() => {
    res.status(500).json({ error: 'Authorization check failed' })
  })
}
