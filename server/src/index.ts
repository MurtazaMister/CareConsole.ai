import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { connectDB } from './config/db'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'

import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import baselineRoutes from './routes/baseline'
import logRoutes from './routes/logs'
import aiRoutes from './routes/ai'

const app = express()

// Middleware
app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/user', authMiddleware, userRoutes)
app.use('/api/baseline', authMiddleware, baselineRoutes)
app.use('/api/logs', authMiddleware, logRoutes)
app.use('/api/ai', authMiddleware, aiRoutes)

// Error handler (must be last)
app.use(errorHandler)

// Start
connectDB().then(() => {
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`)
  })
})
