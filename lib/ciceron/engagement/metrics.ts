/**
 * Growth indicators for /ciceron/admin/metricas.
 * Prefers SQL views when available; falls back to demo fixtures.
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { FirmWeekRow, MetricCell, MetricsDashboard } from '@/lib/ciceron/engagement/metrics-types'
import {
  HABIT_SEAT_THRESHOLD,
  RATE_SAMPLE_THRESHOLD,
  TURNAROUND_SAMPLE_THRESHOLD,
  fixtureMetricsDashboard,
  reconcileCostWithAiRuns,
  weekStartIso,
} from '@/lib/ciceron/engagement/metrics-pure'

export type { FirmWeekRow, MetricCell, MetricsDashboard }
export {
  HABIT_SEAT_THRESHOLD,
  RATE_SAMPLE_THRESHOLD,
  TURNAROUND_SAMPLE_THRESHOLD,
  fixtureMetricsDashboard,
  reconcileCostWithAiRuns,
  weekStartIso,
}

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

function formatSeconds(sec: number | null, sample: number): MetricCell {
  if (sec == null || sample < TURNAROUND_SAMPLE_THRESHOLD) return dash(sample)
  if (sec < 3600) {
    return { value: sec, display: `${Math.round(sec / 60)} min`, sampleSize: sample, unit: 'seconds' }
  }
  return {
    value: sec,
    display: `${(sec / 3600).toFixed(1)} h`,
    sampleSize: sample,
    unit: 'seconds',
  }
}

export async function loadMetricsDashboard(): Promise<MetricsDashboard> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return fixtureMetricsDashboard()

  try {
    const [
      activation,
      habit,
      precision,
      turnaround,
      valueMoments,
      expansion,
      cost,
    ] = await Promise.all([
      db.from('metric_activation').select('*'),
      db.from('metric_habit_weekly').select('*'),
      db.from('metric_alert_precision_weekly').select('*'),
      db.from('metric_review_turnaround_weekly').select('*'),
      db.from('metric_value_moments_weekly').select('*'),
      db.from('metric_expansion').select('*'),
      db.from('metric_cost_weekly').select('*'),
    ])

    const anyError =
      activation.error ||
      habit.error ||
      precision.error ||
      turnaround.error ||
      valueMoments.error ||
      expansion.error ||
      cost.error
    if (anyError) return fixtureMetricsDashboard()

    const actRows = (activation.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      activated: boolean
      watch_profile_count: number
    }>
    const habitRows = (habit.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      week_start: string
      habit_share: number | null
      sample_size: number
      seat_count: number
    }>
    const precRows = (precision.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      week_start: string
      precision_rate: number | null
      sample_size: number
    }>
    const turnRows = (turnaround.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      week_start: string
      median_seconds_or_null: number | null
      sample_size: number
    }>
    const valueRows = (valueMoments.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      week_start: string
      value_moments: number
      sample_size: number
    }>
    const expRows = (expansion.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      clients: number
      matters: number
      seats: number
    }>
    const costRows = (cost.data ?? []) as Array<{
      firm_id: string
      firm_name: string
      week_start: string
      cost_usd: number
      run_count: number
    }>

    if (!actRows.length && !costRows.length) return fixtureMetricsDashboard()

    const weekSet = new Set<string>()
    for (const r of [...habitRows, ...precRows, ...turnRows, ...valueRows, ...costRows]) {
      weekSet.add(String(r.week_start).slice(0, 10))
    }
    const weeks = [...weekSet].sort().reverse()
    const primaryWeek = weeks[0] ?? weekStartIso(new Date())

    const firms = new Map<string, string>()
    for (const r of [...actRows, ...expRows, ...costRows]) {
      firms.set(r.firm_id, r.firm_name)
    }

    const byFirm: FirmWeekRow[] = []
    for (const [firmId, firmName] of firms) {
      for (const weekStart of weeks.length ? weeks : [primaryWeek]) {
        const h = habitRows.find(
          (r) => r.firm_id === firmId && String(r.week_start).slice(0, 10) === weekStart
        )
        const p = precRows.find(
          (r) => r.firm_id === firmId && String(r.week_start).slice(0, 10) === weekStart
        )
        const t = turnRows.find(
          (r) => r.firm_id === firmId && String(r.week_start).slice(0, 10) === weekStart
        )
        const v = valueRows.find(
          (r) => r.firm_id === firmId && String(r.week_start).slice(0, 10) === weekStart
        )
        const c = costRows.find(
          (r) => r.firm_id === firmId && String(r.week_start).slice(0, 10) === weekStart
        )
        const a = actRows.find((r) => r.firm_id === firmId)
        const e = expRows.find((r) => r.firm_id === firmId)

        byFirm.push({
          firmId,
          firmName,
          weekStart,
          activation: boolCell(Boolean(a?.activated)),
          habit: rateOrDash(
            h?.habit_share ?? null,
            h?.sample_size ?? 0,
            HABIT_SEAT_THRESHOLD
          ),
          alertPrecision: rateOrDash(
            p?.precision_rate ?? null,
            p?.sample_size ?? 0,
            RATE_SAMPLE_THRESHOLD
          ),
          reviewTurnaround: formatSeconds(
            t?.median_seconds_or_null ?? null,
            t?.sample_size ?? 0
          ),
          valueMoments: numCell(v?.value_moments ?? 0, v?.sample_size ?? 0),
          expansion: {
            clients: e?.clients ?? 0,
            matters: e?.matters ?? 0,
            seats: e?.seats ?? 0,
            display: `${e?.clients ?? 0} clientes · ${e?.matters ?? 0} asuntos · ${e?.seats ?? 0} asientos`,
          },
          cost: numCell(Number(c?.cost_usd ?? 0), c?.run_count ?? 0, 'usd'),
        })
      }
    }

    const overall =
      byFirm.find(
        (r) => r.firmId === CICERON_SEED.firmDemo && r.weekStart === primaryWeek
      ) ??
      byFirm[0] ??
      fixtureMetricsDashboard().overall

    return {
      source: 'schema',
      overall,
      byFirm,
      weeks: weeks.length ? weeks : [primaryWeek],
    }
  } catch {
    return fixtureMetricsDashboard()
  }
}
