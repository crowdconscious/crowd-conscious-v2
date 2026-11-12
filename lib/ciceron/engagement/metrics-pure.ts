/** Pure metrics helpers (no server-only) for tests. */

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { FirmWeekRow, MetricCell, MetricsDashboard } from '@/lib/ciceron/engagement/metrics-types'

export const RATE_SAMPLE_THRESHOLD = 5
export const TURNAROUND_SAMPLE_THRESHOLD = 3
export const HABIT_SEAT_THRESHOLD = 3

export type { FirmWeekRow, MetricCell, MetricsDashboard }

function dash(sampleSize: number): MetricCell {
  return { value: null, display: '—', sampleSize }
}

function rateOrDash(rate: number | null, sampleSize: number, threshold: number): MetricCell {
  if (sampleSize < threshold || rate == null || Number.isNaN(rate)) {
    return dash(sampleSize)
  }
  return {
    value: rate,
    display: `${(rate * 100).toFixed(0)} %`,
    sampleSize,
  }
}

function numCell(value: number, sampleSize: number, unit?: string): MetricCell {
  return {
    value,
    display: unit === 'usd' ? `USD ${value.toFixed(2)}` : String(value),
    sampleSize,
    unit,
  }
}

function boolCell(value: boolean): MetricCell {
  return {
    value,
    display: value ? 'Sí' : 'No',
    sampleSize: 1,
  }
}

export function weekStartIso(d: Date): string {
  const local = new Date(d)
  const day = local.getUTCDay() || 7
  local.setUTCDate(local.getUTCDate() - day + 1)
  return local.toISOString().slice(0, 10)
}

/** Offline / pre-migration demo numbers labelled Datos de demostración. */
export function fixtureMetricsDashboard(): MetricsDashboard {
  const firmName = 'Despacho Demo, S.C.'
  const firmId = CICERON_SEED.firmDemo
  const thisWeek = weekStartIso(new Date())
  const lastWeek = weekStartIso(new Date(Date.now() - 7 * 86400000))

  const make = (weekStart: string, cost: number, habit: number, moments: number): FirmWeekRow => ({
    firmId,
    firmName,
    weekStart,
    activation: boolCell(true),
    habit: rateOrDash(habit, 5, HABIT_SEAT_THRESHOLD),
    alertPrecision: rateOrDash(0.6, 5, RATE_SAMPLE_THRESHOLD),
    reviewTurnaround: {
      value: 14 * 3600,
      display: '14 h',
      sampleSize: 4,
      unit: 'seconds',
    },
    valueMoments: numCell(moments, moments),
    expansion: {
      clients: 6,
      matters: 7,
      seats: 5,
      display: '6 clientes · 7 asuntos · 5 asientos',
    },
    cost: numCell(cost, 4, 'usd'),
  })

  const current = make(thisWeek, 0.054, 0.4, 3)
  const previous = make(lastWeek, 0.028, 0.2, 2)

  return {
    source: 'fixture',
    overall: current,
    byFirm: [current, previous],
    weeks: [thisWeek, lastWeek],
  }
}

export function reconcileCostWithAiRuns(
  costUsd: number,
  aiRunCosts: number[],
  epsilon = 0.0001
): boolean {
  const sum = aiRunCosts.reduce((a, b) => a + b, 0)
  return Math.abs(sum - costUsd) <= epsilon
}
