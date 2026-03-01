export interface AIReportRequest {
  flareSummary: {
    currentStatus: string
    currentStreak: number
    trendDirection: string
    totalFlareWindows: number
    totalFlareDays: number
    severeFlareDays: number
    worstSymptom: string
    averageCompositeScore: number
  }
  recentFlareWindows: {
    startDate: string
    endDate: string | null
    peakScore: number
    severity: string
    durationDays: number
    dominantSymptom: string
  }[]
  recentDailyAnalysis: {
    date: string
    compositeScore: number
    flareLevel: string
    topContributors: { symptom: string; contribution: number }[]
  }[]
}

export interface AIReport {
  clinicianSummary: string
  plainLanguageSummary: string
  suggestedQuestions: string[]
  generatedAt: string
  disclaimer: string
}
