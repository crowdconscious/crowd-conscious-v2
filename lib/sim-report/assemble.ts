/**
 * Assemble SimReportData from a SimulationReplayPayload (fixture or live API
 * shape) plus optional durable divergence track row.
 */

import { computeDivergence } from '../divergence.ts'
import type { OptionAgg, SimulationReplayPayload } from '../../types/simulation.ts'
import {
  divergenceUnavailableLabel,
  formatDateEs,
} from './format.ts'
import type {
  SimReportData,
  SimReportOptionShare,
  SimReportPersonaSample,
  SimReportSegmentRow,
} from './types.ts'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
  'https://crowdconscious.app'

function ageBand(age: number | null | undefined): string {
  if (age == null || !Number.isFinite(age)) return '—'
  if (age < 25) return '18–24'
  if (age < 35) return '25–34'
  if (age < 45) return '35–44'
  if (age < 55) return '45–54'
  if (age < 65) return '55–64'
  return '65+'
}

function optionSharesFromAggs(
  aggs: OptionAgg[] | null | undefined,
  options: { id: string; label: string }[],
): SimReportOptionShare[] {
  const byId = new Map((aggs ?? []).map((a) => [a.optionId, a]))
  return options.map((o) => {
    const a = byId.get(o.id)
    return {
      optionId: o.id,
      label: o.label,
      share: a != null && Number.isFinite(a.share) ? a.share : null,
      count: a != null && Number.isFinite(a.count) ? a.count : null,
    }
  })
}

/**
 * Recover people (market_votes rows) from real aggregates.
 * Multi chooser-shares: count / share ≈ people. Exclusive single: sum(count).
 * Never sum pickers blindly — that overcounts multi.
 */
function peopleFromRealAggregates(
  aggs: OptionAgg[] | null | undefined
): number {
  if (!aggs || aggs.length === 0) return 0
  for (const a of aggs) {
    const share = a.share
    const count = a.count
    if (
      typeof share === 'number' &&
      share > 0 &&
      Number.isFinite(share) &&
      typeof count === 'number' &&
      count > 0 &&
      Number.isFinite(count)
    ) {
      return Math.round(count / share)
    }
  }
  return aggs.reduce((s, a) => s + (a.count || 0), 0)
}

/**
 * Prefer durable track distributions when present (keyed by option label).
 * Falls back to replay aggregates (keyed by optionId).
 * When track has shares but outcome counts are 0/missing, derive counts from
 * share × realVoteCount so bars sum to n real.
 */
function sharesFromTrackOrAggs(args: {
  options: { id: string; label: string }[]
  trackShares: Record<string, number> | null | undefined
  aggs: OptionAgg[] | null | undefined
  realVoteCount?: number | null
}): SimReportOptionShare[] {
  const { options, trackShares, aggs, realVoteCount } = args
  if (trackShares && Object.keys(trackShares).length > 0) {
    const byLabel = new Map(
      Object.entries(trackShares).map(([k, v]) => [k.trim().toLowerCase(), v]),
    )
    const aggById = new Map((aggs ?? []).map((a) => [a.optionId, a]))
    return options.map((o) => {
      const share =
        byLabel.get(o.label.trim().toLowerCase()) ??
        byLabel.get(o.id.trim().toLowerCase()) ??
        null
      const agg = aggById.get(o.id)
      let count: number | null =
        agg != null && Number.isFinite(agg.count) ? agg.count : null
      if (
        (count == null || count === 0) &&
        share != null &&
        Number.isFinite(share) &&
        realVoteCount != null &&
        realVoteCount > 0
      ) {
        count = Math.round(share * realVoteCount)
      }
      return {
        optionId: o.id,
        label: o.label,
        share: share != null && Number.isFinite(share) ? share : null,
        count,
      }
    })
  }
  return optionSharesFromAggs(aggs, options)
}

function distributionHasSignal(
  rows: SimReportOptionShare[] | null | undefined,
): boolean {
  if (!rows || rows.length === 0) return false
  return rows.some(
    (r) =>
      (r.count != null && r.count > 0) ||
      (r.share != null && Number.isFinite(r.share) && r.share > 0),
  )
}

function readTrackShares(
  dist: unknown,
): Record<string, number> | null {
  if (!dist || typeof dist !== 'object') return null
  const obj = dist as {
    option_shares?: Record<string, number>
    confidence_weighted_shares?: Record<string, number>
  }
  const pick = (shares: Record<string, number> | undefined) => {
    if (!shares || typeof shares !== 'object') return null
    const entries = Object.entries(shares).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v),
    )
    if (entries.length === 0) return null
    const sum = entries.reduce((s, [, v]) => s + v, 0)
    if (sum <= 0) return null
    return Object.fromEntries(entries)
  }
  return pick(obj.option_shares) ?? pick(obj.confidence_weighted_shares)
}

function buildSegments(
  personas: SimReportPersonaSample[],
): SimReportData['segments'] {
  const group = (
    keyFn: (p: SimReportPersonaSample) => string,
  ): SimReportSegmentRow[] => {
    const map = new Map<string, SimReportSegmentRow>()
    for (const p of personas) {
      const key = keyFn(p)
      let row = map.get(key)
      if (!row) {
        row = { key, label: key, count: 0, optionCounts: {} }
        map.set(key, row)
      }
      row.count += 1
      if (p.optionId) {
        row.optionCounts[p.optionId] = (row.optionCounts[p.optionId] ?? 0) + 1
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }

  return {
    byAlcaldia: group((p) => p.alcaldia || '—'),
    byAgeBand: group((p) => ageBand(p.age)),
    byNse: group((p) => p.nseBand || '—'),
  }
}

export type TrackDivergenceRow = {
  divergence_score: number | null
  has_real_data: boolean
  real_vote_count: number
  outcome: string
  simulated_distribution: unknown
  real_distribution: unknown
}

function finiteScore(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null
}

/**
 * Prefer a stored score; when older/manual runs have real + sim distributions
 * but no durable row / run.divergence_index, compute with the same viewer
 * formula (`lib/divergence.computeDivergence`).
 */
export function resolveReportDivergenceScore(args: {
  storedScore: number | null | undefined
  hasRealData: boolean
  simAggregates: OptionAgg[] | null | undefined
  realAggregates: OptionAgg[] | null | undefined
}): number | null {
  const stored = finiteScore(args.storedScore)
  if (stored != null) return stored
  if (!args.hasRealData) return null
  const sim = args.simAggregates ?? []
  const real = args.realAggregates ?? []
  const realN = peopleFromRealAggregates(real)
  if (realN <= 0 || sim.length === 0) return null
  return computeDivergence(sim, real).index
}

const METHODOLOGY_SHORT =
  'Personas sintéticas basadas en el Censo INEGI (AGEB), ponderadas por población y colocadas en manzanas censales de CDMX. Un modelo de lenguaje vota como cada persona ante la pregunta del Pulse. El índice de divergencia compara esa distribución con los votos reales de la consulta (cuando hay datos suficientes).'

function methodologyFull(args: {
  personaVersion: string | null
  model: string | null
  personaCount: number | null
  completedAt: string | null
  isFixture: boolean
}): string[] {
  const lines = [
    'Esta simulación no es una encuesta probabilística ni un pronóstico oficial. Es un experimento de opinión sintética: un panel de personas ficticias construido a partir de estadísticas públicas del Censo de Población y Vivienda (INEGI) y del marco geoestadístico (AGEB).',
    'Cada persona tiene atributos demográficos (alcaldía/colonia, edad, sexo, educación, ocupación, NSE AMAI) y una narrativa concreta. Su ubicación en el mapa usa centroides de AGEB con un jitter determinista pequeño para que los puntos no se solapen; no inventamos coordenadas fuera del AGEB asignado.',
    `Versión del panel: ${args.personaVersion ?? '—'}. Modelo: ${args.model ?? '—'}. Agentes en esta corrida: ${args.personaCount ?? '—'}. Fecha de corrida: ${formatDateEs(args.completedAt)}.`,
    'El índice de divergencia (0–100) mide la distancia entre la distribución simulada y la de votos reales del Pulse. Si no hay votos reales suficientes, el índice se muestra como "—" (nunca como 0 falso).',
  ]
  if (args.isFixture) {
    lines.push(
      'Este documento se generó a partir de datos FIXTURE de demostración. No representa una corrida real ni resultados de ciudadanos.',
    )
  }
  return lines
}

export type AssembleReportInput = {
  payload: SimulationReplayPayload
  track?: TrackDivergenceRow | null
  /** Override persona_version / model when loaded from DB run row. */
  runExtras?: {
    personaVersion?: string | null
    model?: string | null
  }
  mapPng?: Buffer | null
  generatedAt?: string
}

/** Build SimReportData from a replay payload (+ optional track row). */
export function assembleSimReportData(input: AssembleReportInput): SimReportData {
  const { payload, track } = input
  const options = [...payload.pulse.options].sort((a, b) => a.order - b.order)
  const optionLabel = new Map(options.map((o) => [o.id, o.label]))

  const simTrack = readTrackShares(track?.simulated_distribution)
  const realTrack = readTrackShares(track?.real_distribution)

  // Prefer track.has_real_data when a row exists; otherwise infer from
  // replay aggregates (older/manual runs may lack pulse_simulation_divergence).
  const hasRealData = track
    ? track.has_real_data
    : payload.realAggregates != null &&
      payload.realAggregates.some((a) => (a.count || 0) > 0)

  // People count — never sum outcome pickers (multi overcounts). Prefer track;
  // else recover people from count/share when shares are chooser-shares.
  const realVoteCount = track
    ? track.real_vote_count
    : peopleFromRealAggregates(payload.realAggregates)

  const simulated = sharesFromTrackOrAggs({
    options,
    trackShares: simTrack,
    aggs: payload.simAggregates,
  })

  let real: SimReportOptionShare[] | null =
    track && !track.has_real_data
      ? null
      : sharesFromTrackOrAggs({
          options,
          trackShares: realTrack,
          aggs: payload.realAggregates,
          realVoteCount,
        })

  let realResultsNote: string | null = null
  const outcome = track?.outcome ?? (hasRealData ? 'scored' : 'no_real_data')
  if (outcome === 'multi_select_unsupported') {
    realResultsNote =
      'Votación multi-opción: el desglose simulado-vs-real por opción no aplica a este modo.'
    real = null
  } else if (hasRealData && realVoteCount > 0 && !distributionHasSignal(real)) {
    // n real > 0 but outcomes/track gave all-zero bars — don't show fake zeros.
    realResultsNote =
      `Hay ${realVoteCount} voto${realVoteCount === 1 ? '' : 's'} real${realVoteCount === 1 ? '' : 'es'}, pero el desglose por opción no está disponible (conteos de outcomes vacíos o no sincronizados; puede deberse a ponderación por certeza).`
    real = null
  }

  const personas: SimReportPersonaSample[] = payload.votes.map((v) => ({
    personaKey: v.persona.personaKey,
    alcaldia: v.persona.alcaldia,
    colonia: v.persona.colonia,
    age: v.persona.age,
    sex: v.persona.sex,
    education: v.persona.education,
    occupation: v.persona.occupation,
    nseBand: v.persona.nseBand,
    agebCode: v.persona.agebCode,
    centroidLat: v.persona.centroidLat,
    centroidLng: v.persona.centroidLng,
    optionId: v.optionId,
    optionLabel: optionLabel.get(v.optionId) ?? null,
  }))

  const storedScore = track
    ? track.has_real_data
      ? track.divergence_score
      : null
    : payload.run.divergenceIndex

  const score = resolveReportDivergenceScore({
    storedScore,
    hasRealData,
    simAggregates: payload.simAggregates,
    realAggregates: payload.realAggregates,
  })

  // "sin datos…" only when there truly is no real comparison — not when the
  // score was simply never persisted for an older run.
  const unavailableReason =
    !hasRealData || realVoteCount <= 0 ? divergenceUnavailableLabel() : null

  const personaVersion = input.runExtras?.personaVersion ?? null
  const model = input.runExtras?.model ?? payload.run.model

  return {
    marketId: payload.pulse.id,
    question: payload.pulse.question,
    pulseStatus: payload.pulse.status,
    pulseUrl: `${APP_URL}/pulse/${payload.pulse.id}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    run: {
      id: payload.run.id,
      model,
      personaVersion,
      personaCount: payload.run.personaCount,
      completedAt: payload.run.completedAt,
      revealedAt: null,
      isFixture: payload.isFixture || payload.run.isFixture,
    },
    divergence: {
      score: hasRealData ? score : null,
      hasRealData,
      outcome,
      realVoteCount,
      unavailableReason,
    },
    simulated,
    real: hasRealData ? real : null,
    realResultsNote,
    methodologyShort: METHODOLOGY_SHORT,
    methodologyFull: methodologyFull({
      personaVersion,
      model,
      personaCount: payload.run.personaCount,
      completedAt: payload.run.completedAt,
      isFixture: payload.isFixture || payload.run.isFixture,
    }),
    personas,
    segments: buildSegments(personas),
    mapPng: input.mapPng ?? null,
    branding: {
      productName: 'Crowd Conscious',
      siteHost: 'crowdconscious.app',
    },
  }
}
