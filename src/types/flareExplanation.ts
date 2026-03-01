import type { FlareWindow, DayAnalysis } from '../lib/flareEngine'

export interface FlareExplanationRequest {
  flareWindow: FlareWindow
  dailyAnalysis: DayAnalysis[]
}

export interface FlareExplanation {
  explanation: string
  generatedAt: string
}

export type FlareExplanationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: FlareExplanation }
  | { status: 'error'; error: string }
