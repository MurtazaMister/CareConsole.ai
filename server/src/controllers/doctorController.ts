import { Request, Response } from 'express'
import DoctorClient from '../models/DoctorClient'
import User from '../models/User'
import Baseline from '../models/Baseline'
import DailyLog from '../models/DailyLog'
import UserSchema from '../models/UserSchema'

// ── List doctor's clients ────────────────────────────────

export async function getClients(req: Request, res: Response) {
  const links = await DoctorClient.find({ doctorId: req.userId }).lean()
  if (links.length === 0) {
    res.json({ clients: [] })
    return
  }

  const patientIds = links.map((l) => l.patientId)

  // Fetch patients, baselines, and latest logs in parallel
  const [patients, baselines, latestLogs] = await Promise.all([
    User.find({ _id: { $in: patientIds } }).select('-password').lean(),
    Baseline.find({ userId: { $in: patientIds } }).lean(),
    DailyLog.aggregate([
      { $match: { userId: { $in: patientIds } } },
      { $sort: { date: -1 } },
      { $group: { _id: '$userId', lastLog: { $first: '$$ROOT' } } },
    ]),
  ])

  const baselineMap = new Map(baselines.map((b) => [String(b.userId), b]))
  const logMap = new Map(latestLogs.map((l) => [String(l._id), l.lastLog]))

  const clients = patients.map((p) => {
    const baseline = baselineMap.get(String(p._id))
    const lastLog = logMap.get(String(p._id))
    return {
      id: p._id,
      username: p.username,
      email: p.email,
      profile: p.profile,
      condition: baseline?.primaryCondition ?? null,
      conditionDurationMonths: baseline?.conditionDurationMonths ?? null,
      lastLogDate: lastLog?.date ?? null,
      lastDeviationScore: lastLog?.deviationScore ?? null,
      lastFlareRisk: lastLog?.flareRiskLevel ?? null,
      addedAt: links.find((l) => String(l.patientId) === String(p._id))?.addedAt,
    }
  })

  res.json({ clients })
}

// ── Add a client by username ─────────────────────────────

export async function addClient(req: Request, res: Response) {
  const { username } = req.body
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Username is required' })
    return
  }

  const patient = await User.findOne({
    username: { $regex: new RegExp(`^${username.trim()}$`, 'i') },
  }).select('-password')

  if (!patient) {
    res.status(404).json({ error: `No user found with username "${username}"` })
    return
  }

  if (patient.role === 'doctor') {
    res.status(400).json({ error: 'Cannot add a doctor as a client' })
    return
  }

  if (String(patient._id) === String(req.userId)) {
    res.status(400).json({ error: 'Cannot add yourself as a client' })
    return
  }

  // Check if already a client
  const existing = await DoctorClient.findOne({ doctorId: req.userId, patientId: patient._id })
  if (existing) {
    res.status(409).json({ error: `${patient.username} is already in your client list` })
    return
  }

  await DoctorClient.create({ doctorId: req.userId, patientId: patient._id })

  // Return the client summary
  const baseline = await Baseline.findOne({ userId: patient._id }).lean()
  res.status(201).json({
    client: {
      id: patient._id,
      username: patient.username,
      email: patient.email,
      profile: patient.profile,
      condition: baseline?.primaryCondition ?? null,
      conditionDurationMonths: baseline?.conditionDurationMonths ?? null,
      lastLogDate: null,
      lastDeviationScore: null,
      lastFlareRisk: null,
      addedAt: new Date(),
    },
  })
}

// ── Remove a client ──────────────────────────────────────

export async function removeClient(req: Request, res: Response) {
  const { patientId } = req.params
  const result = await DoctorClient.deleteOne({ doctorId: req.userId, patientId })
  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Client not found' })
    return
  }
  res.json({ message: 'Client removed' })
}

// ── Get full patient data ────────────────────────────────

export async function getClientData(req: Request, res: Response) {
  const { patientId } = req.params

  // Verify this patient is the doctor's client
  const link = await DoctorClient.findOne({ doctorId: req.userId, patientId })
  if (!link) {
    res.status(403).json({ error: 'This patient is not in your client list' })
    return
  }

  const [patient, baseline, logs, schema] = await Promise.all([
    User.findById(patientId).select('-password').lean(),
    Baseline.findOne({ userId: patientId }).lean(),
    DailyLog.find({ userId: patientId }).sort({ date: -1 }).lean(),
    UserSchema.findOne({ userId: patientId }).lean(),
  ])

  if (!patient) {
    res.status(404).json({ error: 'Patient not found' })
    return
  }

  res.json({
    patient: {
      id: patient._id,
      username: patient.username,
      email: patient.email,
      profile: patient.profile,
    },
    baseline,
    logs,
    schema: schema?.formSchema ?? null,
    metrics: {
      finalMetrics: schema?.finalMetrics ?? [],
      transientMetrics: schema?.transientMetrics ?? [],
      tombstoneMetrics: schema?.tombstoneMetrics ?? [],
    },
  })
}
