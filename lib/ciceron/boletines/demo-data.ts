import 'server-only'

import { CICERON_BOLETIN_SOURCES } from '@/lib/ciceron/boletines/seed-ids'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

export type BulletinBoardStatus =
  | 'revisado'
  | 'parcial'
  | 'fallo'
  | 'manual'
  | 'sin_publicacion'

export type BulletinStateBoardRow = {
  stateCode: string
  stateName: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  status: BulletinBoardStatus
  statusLabel: string
  runId: string | null
  failureMessage: string | null
  hitsExact: number
  hitsPossible: number
  tier: string
}

export type BulletinHitView = {
  id: string
  stateCode: string
  stateName: string
  matchKind: 'exact' | 'possible'
  score: number
  reason: string
  courtName: string | null
  expedienteNumber: string | null
  partyNames: string | null
  summary: string | null
  sourceUrl: string | null
  matterId: string | null
  caseFileId: string | null
  reviewState: string
  informativeNotice: string
}

export type ManualCheckView = {
  id: string
  stateCode: string
  stateName: string
  sourceName: string
  sourceUrl: string
  status: string
  assignedTo: string | null
  assignedToName: string | null
  notes: string | null
}

export type TimeSavedView = {
  hoursReplaced: number
  runsCounted: number
  demoLabel: true
}

export type PartnerSummaryCounts = {
  revisado: number
  parcial: number
  fallo: number
  manual: number
  exactHits: number
  possibleHits: number
  revisadoStates: string[]
  manualStates: string[]
  falloStates: string[]
  parcialStates: string[]
}

const STATUS_LABEL: Record<BulletinBoardStatus, string> = {
  revisado: 'Revisado automáticamente',
  parcial: 'Parcial — revisar',
  fallo: 'Falló',
  manual: 'Revisión manual pendiente',
  sin_publicacion: 'Sin publicación confirmada',
}

const INFORMATIVE =
  'Informativo: no constituye notificación judicial. Consulte la fuente oficial.'

type RunRow = {
  id: string
  source_id: string
  status: string
  failure_message: string | null
  hits_exact: number
  hits_possible: number
  metadata: Record<string, unknown> | null
}

function todayMexico(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function mapStatus(runStatus: string | null | undefined): BulletinBoardStatus {
  if (runStatus === 'ok') return 'revisado'
  if (runStatus === 'partial') return 'parcial'
  if (runStatus === 'failed') return 'fallo'
  if (runStatus === 'manual') return 'manual'
  // No run yet → pending manual check, never "sin publicación" (rule 9c).
  return 'manual'
}

/** Failed must never be hidden by an ok/partial run for the same source/day. */
function preferRun(prev: RunRow | undefined, next: RunRow): RunRow {
  if (!prev) return next
  if (next.status === 'failed') return next
  if (prev.status === 'failed') return prev
  if (next.status === 'partial' && prev.status === 'ok') return next
  if (prev.status === 'partial' && next.status === 'ok') return prev
  return next
}

export function computePartnerSummaryCounts(
  board: BulletinStateBoardRow[],
  hits: BulletinHitView[]
): PartnerSummaryCounts {
  const by = (s: BulletinBoardStatus) => board.filter((b) => b.status === s)
  return {
    revisado: by('revisado').length,
    parcial: by('parcial').length,
    fallo: by('fallo').length,
    manual: by('manual').length,
    exactHits: hits.filter((h) => h.matchKind === 'exact').length,
    possibleHits: hits.filter((h) => h.matchKind === 'possible').length,
    revisadoStates: by('revisado').map((b) => b.stateName),
    manualStates: by('manual').map((b) => b.stateName),
    falloStates: by('fallo').map((b) => b.stateName),
    parcialStates: by('parcial').map((b) => b.stateName),
  }
}

export function formatPartnerSummaryPreview(input: {
  firmName: string
  preparerName: string
  board: BulletinStateBoardRow[]
  hits: BulletinHitView[]
  manuals: ManualCheckView[]
}): string {
  const c = computePartnerSummaryCounts(input.board, input.hits)
  const lines = [
    'Resumen de boletines — vista previa (no enviado)',
    `Despacho: ${input.firmName}`,
    `Preparó: ${input.preparerName}`,
    '',
  ]
  if (c.revisadoStates.length) {
    lines.push(`Estados revisados automáticamente: ${c.revisadoStates.join(', ')}.`)
  }
  if (c.parcialStates.length) {
    lines.push(`Revisión parcial: ${c.parcialStates.join(', ')}.`)
  }
  if (c.falloStates.length) {
    lines.push(
      `Corridas fallidas visibles (no «sin novedades»): ${c.falloStates.join(', ')}.`
    )
  }
  if (c.manualStates.length) {
    const manualDetail = input.manuals
      .map((m) => {
        const st =
          m.status === 'asignado'
            ? 'asignada'
            : m.status === 'hecha'
              ? 'hecha'
              : 'sin asignar'
        return `${m.stateName} (${st})`
      })
      .join(', ')
    lines.push(
      `Revisión manual pendiente: ${manualDetail || c.manualStates.join(', ')}.`
    )
  }
  lines.push(
    `Coincidencias exactas de demostración: ${c.exactHits}; posibles: ${c.possibleHits}.`
  )
  lines.push('')
  lines.push(
    'Datos de demostración. Informativo: no constituye notificación judicial.'
  )
  return lines.join('\n')
}

/** Offline fixture board — Datos de demostración. */
export function fixtureBulletinBoard(): {
  board: BulletinStateBoardRow[]
  hits: BulletinHitView[]
  manuals: ManualCheckView[]
  timeSaved: TimeSavedView
} {
  const board: BulletinStateBoardRow[] = [
    {
      stateCode: 'QRO',
      stateName: 'Querétaro',
      sourceId: CICERON_BOLETIN_SOURCES.queretaro,
      sourceName: 'Lista de Acuerdos Primera Instancia',
      sourceUrl:
        'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
      status: 'revisado',
      statusLabel: STATUS_LABEL.revisado,
      runId: 'fixture-qro',
      failureMessage: null,
      hitsExact: 2,
      hitsPossible: 0,
      tier: 'B',
    },
    {
      stateCode: 'JAL',
      stateName: 'Jalisco',
      sourceId: CICERON_BOLETIN_SOURCES.jalisco,
      sourceName: 'Extractos / Boletín CJJ',
      sourceUrl: 'https://cjj.gob.mx/bulletin',
      status: 'revisado',
      statusLabel: STATUS_LABEL.revisado,
      runId: 'fixture-jal',
      failureMessage: null,
      hitsExact: 1,
      hitsPossible: 1,
      tier: 'A',
    },
    {
      stateCode: 'CDMX',
      stateName: 'Ciudad de México',
      sourceId: CICERON_BOLETIN_SOURCES.cdmx,
      sourceName: 'Boletín Judicial PJCDMX',
      sourceUrl: 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
      // Seeded failed probe must surface; ok must not hide it (rule 9c).
      status: 'fallo',
      statusLabel: STATUS_LABEL.fallo,
      runId: 'fixture-cdmx-fail',
      failureMessage:
        'Datos de demostración. Sondeo fallido (Cloudflare/bloqueo simulado) — nunca presentar como «sin novedades».',
      hitsExact: 1,
      hitsPossible: 0,
      tier: 'A',
    },
    {
      stateCode: 'MEX',
      stateName: 'Estado de México',
      sourceId: CICERON_BOLETIN_SOURCES.edomex,
      sourceName: 'Boletín / lista PJEDOMEX',
      sourceUrl: 'https://notificacion.pjedomex.gob.mx/',
      status: 'revisado',
      statusLabel: STATUS_LABEL.revisado,
      runId: 'fixture-mex',
      failureMessage: null,
      hitsExact: 1,
      hitsPossible: 0,
      tier: 'not_verified',
    },
    {
      stateCode: 'GTO',
      stateName: 'Guanajuato',
      sourceId: CICERON_BOLETIN_SOURCES.guanajuato,
      sourceName: 'Lista de Acuerdos — Primera Instancia',
      sourceUrl:
        'https://www.poderjudicial-gto.gob.mx/modules.php?name=Acuerdos&file=primera_instancia',
      status: 'manual',
      statusLabel: STATUS_LABEL.manual,
      runId: 'fixture-gto',
      failureMessage: 'Fuente tier D (captcha): revisión manual pendiente.',
      hitsExact: 0,
      hitsPossible: 0,
      tier: 'D',
    },
    {
      stateCode: 'NL',
      stateName: 'Nuevo León',
      sourceId: CICERON_BOLETIN_SOURCES.nuevoLeon,
      sourceName: 'Boletín Judicial PJENL',
      sourceUrl: 'https://www.pjenl.gob.mx/BoletinJudicial/',
      status: 'manual',
      statusLabel: STATUS_LABEL.manual,
      runId: 'fixture-nl',
      failureMessage: 'Fuente tier D (captcha): revisión manual pendiente.',
      hitsExact: 0,
      hitsPossible: 0,
      tier: 'D',
    },
  ]

  const hits: BulletinHitView[] = [
    {
      id: 'hit-qro-1',
      stateCode: 'QRO',
      stateName: 'Querétaro',
      matchKind: 'exact',
      score: 1,
      reason:
        'Coincidencia exacta de expediente (123/2026) y juzgado («Juzgado Primero Civil de Querétaro»).',
      courtName: 'Juzgado Primero Civil de Querétaro',
      expedienteNumber: '123/2026',
      partyNames: 'Nexora Pagos, S.A.P.I. de C.V. / Comercial Ficticia Delta, S.A. de C.V.',
      summary: 'Se tiene por presentado el escrito de demanda. Datos de demostración.',
      sourceUrl:
        'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
      matterId: CICERON_SEED.matters.nexoraCnbv,
      caseFileId: 'f1000000-0000-4000-8000-000000000021',
      reviewState: 'pendiente',
      informativeNotice: INFORMATIVE,
    },
    {
      id: 'hit-qro-2',
      stateCode: 'QRO',
      stateName: 'Querétaro',
      matchKind: 'exact',
      score: 1,
      reason:
        'Coincidencia exacta de expediente (88/2025) y juzgado («Juzgado Segundo Familiar de Querétaro»).',
      courtName: 'Juzgado Segundo Familiar de Querétaro',
      expedienteNumber: '88/2025',
      partyNames:
        'Fondo Pedregal Inmuebles, S.A. de C.V. / Contraparte Demo Arrendamiento',
      summary: 'Se señala fecha de audiencia. Datos de demostración.',
      sourceUrl:
        'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
      matterId: CICERON_SEED.matters.fondoPedregal,
      caseFileId: 'f1000000-0000-4000-8000-000000000022',
      reviewState: 'pendiente',
      informativeNotice: INFORMATIVE,
    },
    {
      id: 'hit-jal-1',
      stateCode: 'JAL',
      stateName: 'Jalisco',
      matchKind: 'exact',
      score: 1,
      reason: 'Coincidencia exacta de expediente (210/2026) y juzgado.',
      courtName: 'Juzgado Primero de lo Civil — Ciudad Judicial',
      expedienteNumber: '210/2026',
      partyNames:
        'Alimentos del Bajío Integrados, S.A. de C.V. / Distribuidora Ficticia Sol',
      summary: 'Se admite demanda mercantil. Datos de demostración.',
      sourceUrl: 'https://cjj.gob.mx/bulletin',
      matterId: CICERON_SEED.matters.alimentosNom,
      caseFileId: 'f1000000-0000-4000-8000-000000000023',
      reviewState: 'pendiente',
      informativeNotice: INFORMATIVE,
    },
    {
      id: 'hit-jal-2',
      stateCode: 'JAL',
      stateName: 'Jalisco',
      matchKind: 'possible',
      score: 0.86,
      reason:
        'Posible coincidencia por tokens de nombre de parte (variante demo «Fondo Pedregal Inmuebles»).',
      courtName: 'Juzgado Familiar de Zapopan',
      expedienteNumber: '15/2026',
      partyNames: 'Pedregal Fondo Inmuebles Demo / Demo Contraparte Familiar',
      summary: 'Se provee escrito de desahogo. Datos de demostración.',
      sourceUrl: 'https://cjj.gob.mx/bulletin',
      matterId: CICERON_SEED.matters.fondoPedregal,
      caseFileId: 'f1000000-0000-4000-8000-000000000022',
      reviewState: 'pendiente',
      informativeNotice: INFORMATIVE,
    },
    {
      id: 'hit-cdmx-1',
      stateCode: 'CDMX',
      stateName: 'Ciudad de México',
      matchKind: 'exact',
      score: 1,
      reason: 'Coincidencia exacta de expediente (512/2026) y juzgado (CDMX demo).',
      courtName: 'Juzgado 32 Civil CDMX',
      expedienteNumber: '512/2026',
      partyNames: 'Nexora Pagos, S.A.P.I. de C.V. / Demandado Ficticio Centro',
      summary: 'Boletín judicial (demostración): se ordena vista. Datos de demostración.',
      sourceUrl: 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
      matterId: CICERON_SEED.matters.nexoraCnbv,
      caseFileId: 'f1000000-0000-4000-8000-000000000024',
      reviewState: 'en_revision',
      informativeNotice: INFORMATIVE,
    },
    {
      id: 'hit-mex-1',
      stateCode: 'MEX',
      stateName: 'Estado de México',
      matchKind: 'exact',
      score: 1,
      reason: 'Coincidencia exacta de expediente (901/2026) y juzgado (Edomex demo).',
      courtName: 'Juzgado Primero Civil Toluca',
      expedienteNumber: '901/2026',
      partyNames: 'Distribuidora Farma Sierra, S.A. de C.V. / Contraparte Demo Toluca',
      summary: 'Lista de acuerdos (demostración): se admite prueba. Datos de demostración.',
      sourceUrl: 'https://notificacion.pjedomex.gob.mx/',
      matterId: CICERON_SEED.matters.farmaCofepris,
      caseFileId: 'f1000000-0000-4000-8000-000000000025',
      reviewState: 'pendiente',
      informativeNotice: INFORMATIVE,
    },
  ]

  const manuals: ManualCheckView[] = [
    {
      id: 'man-gto',
      stateCode: 'GTO',
      stateName: 'Guanajuato',
      sourceName: 'Lista de Acuerdos — Primera Instancia',
      sourceUrl:
        'https://www.poderjudicial-gto.gob.mx/modules.php?name=Acuerdos&file=primera_instancia',
      status: 'asignado',
      assignedTo: CICERON_SEED.personas.pasante,
      assignedToName: 'Pasante Demo López',
      notes: null,
    },
    {
      id: 'man-nl',
      stateCode: 'NL',
      stateName: 'Nuevo León',
      sourceName: 'Boletín Judicial PJENL',
      sourceUrl: 'https://www.pjenl.gob.mx/BoletinJudicial/',
      status: 'pendiente',
      assignedTo: null,
      assignedToName: null,
      notes: null,
    },
  ]

  return {
    board,
    hits,
    manuals,
    timeSaved: {
      hoursReplaced: 1.5 + 1.2 + 2.0 + 1.8,
      runsCounted: 4,
      demoLabel: true,
    },
  }
}

export type BulletinBoardLoadResult = {
  source: 'schema' | 'fixture' | 'error'
  error?: string
  board: BulletinStateBoardRow[]
  hits: BulletinHitView[]
  manuals: ManualCheckView[]
  timeSaved: TimeSavedView
  asOf: string
}

function isSeedDemoFirm(firmId: string): boolean {
  return (
    firmId === CICERON_SEED.firmDemo || firmId === CICERON_SEED.firmContraste
  )
}

function emptyTimeSaved(): TimeSavedView {
  return { hoursReplaced: 0, runsCounted: 0, demoLabel: true }
}

function fixtureOrError(
  asOf: string,
  isDemo: boolean,
  reason: string
): BulletinBoardLoadResult {
  if (isDemo) {
    return { source: 'fixture', asOf, ...fixtureBulletinBoard() }
  }
  return {
    source: 'error',
    error: reason,
    asOf,
    board: [],
    hits: [],
    manuals: [],
    timeSaved: emptyTimeSaved(),
  }
}

export async function loadBulletinBoard(
  persona: DemoPersona
): Promise<BulletinBoardLoadResult> {
  const asOf = todayMexico()
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return fixtureOrError(
      asOf,
      isSeedDemoFirm(persona.firmId),
      'Sin conexión a la base de datos del despacho.'
    )
  }

  try {
    const { data: firmRow } = await db
      .from('firms')
      .select('is_demo')
      .eq('id', persona.firmId)
      .maybeSingle()
    const isDemo =
      Boolean((firmRow as { is_demo?: boolean } | null)?.is_demo) ||
      isSeedDemoFirm(persona.firmId)

    const { data: sources, error: srcErr } = await db
      .from('bulletin_sources')
      .select(
        'id, state_code, state_name, display_name, landing_url, proposed_tier'
      )
      .in('id', Object.values(CICERON_BOLETIN_SOURCES))

    if (srcErr || !Array.isArray(sources) || sources.length === 0) {
      return fixtureOrError(
        asOf,
        isDemo,
        srcErr?.message ?? 'No hay fuentes de boletín registradas.'
      )
    }

    let runsQuery = db
      .from('bulletin_runs')
      .select(
        'id, source_id, status, failure_message, hits_exact, hits_possible, publication_date, metadata, is_demo'
      )
      .eq('firm_id', persona.firmId)
      .eq('publication_date', asOf)
    if (isDemo) runsQuery = runsQuery.eq('is_demo', true)

    const { data: runs, error: runsErr } = await runsQuery

    if (runsErr) {
      return fixtureOrError(asOf, isDemo, runsErr.message)
    }

    const runList = Array.isArray(runs) ? runs : []
    // No runs for today: demo firms get the whole fixture (never mix).
    if (runList.length === 0) {
      if (isDemo) {
        return { source: 'fixture', asOf, ...fixtureBulletinBoard() }
      }
      // Real firm: empty schema board from sources — no fixture fill.
      const board: BulletinStateBoardRow[] = (
        sources as Array<{
          id: string
          state_code: string
          state_name: string
          display_name: string
          landing_url: string
          proposed_tier: string
        }>
      ).map((s) => {
        const status = mapStatus(undefined)
        return {
          stateCode: s.state_code,
          stateName: s.state_name,
          sourceId: s.id,
          sourceName: s.display_name,
          sourceUrl: s.landing_url,
          status,
          statusLabel: STATUS_LABEL[status],
          runId: null,
          failureMessage: null,
          hitsExact: 0,
          hitsPossible: 0,
          tier: s.proposed_tier,
        }
      })
      return {
        source: 'schema',
        asOf,
        board,
        hits: [],
        manuals: [],
        timeSaved: emptyTimeSaved(),
      }
    }

    const runBySource = new Map<string, RunRow>()
    for (const r of runList) {
      const row = r as RunRow
      runBySource.set(row.source_id, preferRun(runBySource.get(row.source_id), row))
    }

    const board: BulletinStateBoardRow[] = (
      sources as Array<{
        id: string
        state_code: string
        state_name: string
        display_name: string
        landing_url: string
        proposed_tier: string
      }>
    ).map((s) => {
      const run = runBySource.get(s.id)
      const status = mapStatus(run?.status)
      return {
        stateCode: s.state_code,
        stateName: s.state_name,
        sourceId: s.id,
        sourceName: s.display_name,
        sourceUrl: s.landing_url,
        status,
        statusLabel: STATUS_LABEL[status],
        runId: run?.id ?? null,
        failureMessage: run?.failure_message ?? null,
        hitsExact: run?.hits_exact ?? 0,
        hitsPossible: run?.hits_possible ?? 0,
        tier: s.proposed_tier,
      }
    })

    let hitsQuery = db
      .from('bulletin_hits')
      .select(
        'id, match_kind, score, reason, matter_id, case_file_id, review_state, entry_id, run_id'
      )
      .eq('firm_id', persona.firmId)
      .order('created_at', { ascending: false })
      .limit(40)
    if (isDemo) hitsQuery = hitsQuery.eq('is_demo', true)
    const { data: hitRows } = await hitsQuery

    const entryIds = (Array.isArray(hitRows) ? hitRows : []).map(
      (h) => (h as { entry_id: string }).entry_id
    )
    const { data: entries } = entryIds.length
      ? await db
          .from('bulletin_entries')
          .select(
            'id, court_name, expediente_number, party_names, summary, source_url, source_id, publication_date'
          )
          .in('id', entryIds)
      : { data: [] }

    const entryMap = new Map(
      (Array.isArray(entries) ? entries : []).map((e) => [
        (e as { id: string }).id,
        e as {
          id: string
          court_name: string | null
          expediente_number: string | null
          party_names: string | null
          summary: string | null
          source_url: string | null
          source_id: string
        },
      ])
    )

    const sourceMeta = new Map(
      (
        sources as Array<{
          id: string
          state_code: string
          state_name: string
        }>
      ).map((s) => [s.id, s])
    )

    const hits: BulletinHitView[] = (Array.isArray(hitRows) ? hitRows : [])
      .map((h) => {
        const hit = h as {
          id: string
          match_kind: 'exact' | 'possible'
          score: number
          reason: string
          matter_id: string | null
          case_file_id: string | null
          review_state: string
          entry_id: string
        }
        const ent = entryMap.get(hit.entry_id)
        const src = ent ? sourceMeta.get(ent.source_id) : null
        if (!ent || !src) return null
        return {
          id: hit.id,
          stateCode: src.state_code,
          stateName: src.state_name,
          matchKind: hit.match_kind,
          score: Number(hit.score),
          reason: hit.reason,
          courtName: ent.court_name,
          expedienteNumber: ent.expediente_number,
          partyNames: ent.party_names,
          summary: ent.summary,
          sourceUrl: ent.source_url,
          matterId: hit.matter_id,
          caseFileId: hit.case_file_id,
          reviewState: hit.review_state,
          informativeNotice: INFORMATIVE,
        } satisfies BulletinHitView
      })
      .filter(Boolean) as BulletinHitView[]

    let manualsQuery = db
      .from('bulletin_manual_checks')
      .select(
        'id, source_id, status, source_url, assigned_to, notes, check_date'
      )
      .eq('firm_id', persona.firmId)
      .eq('check_date', asOf)
    if (isDemo) manualsQuery = manualsQuery.eq('is_demo', true)
    const { data: manualsRaw } = await manualsQuery

    const manuals: ManualCheckView[] = (
      Array.isArray(manualsRaw) ? manualsRaw : []
    ).map((m) => {
      const row = m as {
        id: string
        source_id: string
        status: string
        source_url: string
        assigned_to: string | null
        notes: string | null
      }
      const src = sourceMeta.get(row.source_id)
      return {
        id: row.id,
        stateCode: src?.state_code ?? '—',
        stateName: src?.state_name ?? '—',
        sourceName:
          (sources as Array<{ id: string; display_name: string }>).find(
            (s) => s.id === row.source_id
          )?.display_name ?? 'Fuente',
        sourceUrl: row.source_url,
        status: row.status,
        assignedTo: row.assigned_to,
        assignedToName:
          row.assigned_to === CICERON_SEED.personas.pasante
            ? 'Pasante Demo López'
            : row.assigned_to,
        notes: row.notes,
      }
    })

    let hours = 0
    let runsCounted = 0
    for (const r of runList) {
      const meta = (r as { metadata?: Record<string, unknown>; status: string })
        .metadata
      const h = meta?.hours_manual_replaced
      if (typeof h === 'number' && (r as { status: string }).status === 'ok') {
        hours += h
        runsCounted += 1
      }
    }

    return {
      source: 'schema',
      asOf,
      board,
      hits,
      manuals,
      timeSaved: {
        hoursReplaced: hours,
        runsCounted,
        demoLabel: true,
      },
    }
  } catch (err) {
    return fixtureOrError(
      asOf,
      isSeedDemoFirm(persona.firmId),
      err instanceof Error ? err.message : 'Error al cargar el tablero de boletines.'
    )
  }
}
