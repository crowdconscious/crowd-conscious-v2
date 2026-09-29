/**
 * Canonical data shape for summary + full simulation PDF reports.
 * Never invent numbers — missing fields stay null and render as "—".
 */

export type SimReportOptionShare = {
  optionId: string
  label: string
  /** 0–1 share, or null when unknown. */
  share: number | null
  count: number | null
}

export type SimReportPersonaSample = {
  personaKey: string
  alcaldia: string
  colonia: string | null
  age: number | null
  sex: string | null
  education: string | null
  occupation: string | null
  nseBand: string | null
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
  optionId: string | null
  optionLabel: string | null
}

export type SimReportSegmentRow = {
  key: string
  label: string
  count: number
  /** optionId → count within segment */
  optionCounts: Record<string, number>
}

export type SimReportData = {
  marketId: string
  question: string
  pulseStatus: string
  pulseUrl: string
  /** ISO */
  generatedAt: string
  run: {
    id: string
    model: string | null
    personaVersion: string | null
    personaCount: number | null
    completedAt: string | null
    revealedAt: string | null
    isFixture: boolean
  }
  divergence: {
    score: number | null
    hasRealData: boolean
    outcome: string | null
    realVoteCount: number
    /** Human hint when score is null due to missing real data. */
    unavailableReason: string | null
  }
  simulated: SimReportOptionShare[]
  real: SimReportOptionShare[] | null
  methodologyShort: string
  methodologyFull: string[]
  /** Full-report only inputs (may be empty for summary). */
  personas: SimReportPersonaSample[]
  segments: {
    byAlcaldia: SimReportSegmentRow[]
    byAgeBand: SimReportSegmentRow[]
    byNse: SimReportSegmentRow[]
  }
  /** Optional PNG buffer of the map snapshot (full report). */
  mapPng: Buffer | null
  branding: {
    productName: string
    siteHost: string
  }
}
