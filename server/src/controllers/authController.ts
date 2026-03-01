import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import { env } from '../config/env'
import { validateUsername, validateEmail, validatePassword } from '../middleware/validate'

function setTokenCookie(res: Response, userId: string) {
  const token = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' })
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

function sanitizeUser(user: InstanceType<typeof User>) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    profile: user.profile,
    createdAt: user.createdAt,
  }
}

export async function signup(req: Request, res: Response) {
  const { username, email, password } = req.body

  if (!username || !validateUsername(username)) {
    res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, underscores)' })
    return
  }
  if (!email || !validateEmail(email)) {
    res.status(400).json({ error: 'Invalid email address' })
    return
  }
  if (!password || !validatePassword(password)) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
    ],
  })
  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username'
    res.status(409).json({ error: `${field} already taken` })
    return
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password: hashedPassword,
  })

  setTokenCookie(res, String(user._id))
  res.status(201).json({ user: sanitizeUser(user) })
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body

  if (!identifier || !password) {
    res.status(400).json({ error: 'Email/username and password are required' })
    return
  }

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
    ],
  })
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  setTokenCookie(res, String(user._id))
  res.json({ user: sanitizeUser(user) })
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.userId).select('-password')
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({ user: sanitizeUser(user) })
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  res.json({ message: 'Logged out' })
}
