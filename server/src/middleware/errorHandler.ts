import { Request, Response, NextFunction } from 'express'

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const error = err as Record<string, unknown>
  console.error('Error:', error.message || error)

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = error.errors as Record<string, { message: string }>
    const messages = Object.values(errors).map((e) => e.message)
    res.status(400).json({ error: 'Validation failed', details: messages })
    return
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    res.status(409).json({ error: 'Duplicate entry', details: error.keyValue })
    return
  }

  const status = typeof error.status === 'number' ? error.status : 500
  const message = typeof error.message === 'string' ? error.message : 'Internal server error'
  res.status(status).json({ error: message })
}
