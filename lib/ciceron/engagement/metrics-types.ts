export type MetricCell = {
  value: number | boolean | null
  display: string
  sampleSize: number
  unit?: string
}

export type FirmWeekRow = {
  firmId: string
  firmName: string
  weekStart: string
  activation: MetricCell
  habit: MetricCell
  alertPrecision: MetricCell
  reviewTurnaround: MetricCell
  valueMoments: MetricCell
  expansion: { clients: number; matters: number; seats: number; display: string }
  cost: MetricCell
}

export type MetricsDashboard = {
  source: 'schema' | 'fixture'
  overall: FirmWeekRow
  byFirm: FirmWeekRow[]
  weeks: string[]
}
