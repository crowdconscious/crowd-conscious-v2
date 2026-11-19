/**
 * Deterministic Pro assistant intent parser (demo). Never sends email.
 * Optional LLM path is behind a flag that defaults OFF.
 */

import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'

export const PRO_ASSISTANT_LLM_FLAG = 'CICERON_PRO_ASSISTANT_LLM'
/** Demo flag — always false unless explicitly enabled in env (callers check). */
export function isProAssistantLlmEnabled(
  env: Record<string, string | undefined> = {}
): boolean {
  return env[PRO_ASSISTANT_LLM_FLAG] === '1' || env[PRO_ASSISTANT_LLM_FLAG] === 'true'
}

export type ProPersonaRole = 'socio' | 'asociado' | 'pasante' | 'coordinador' | 'admin'

/** One resolved bulletin/matter entry the draft can cite. */
export type ProEntry = {
  id: string
  expedienteNumber: string
  courtName: string
  /** Plain-Spanish acuerdo (demo label stripped). */
  acuerdoPlain: string
  publicationDateLabel: string
  sourceName: string
  matterLabel: string
  caseFileId: string
  matterId: string
}

export type ProClientRef = {
  id: string
  name: string
  /** Matter ids the pasante may access; null = firm-wide. */
  allowedMatterIds: string[] | null
  /** Canonical case file when no entry is selected. */
  caseFileId: string
  matterId: string
  entries: ProEntry[]
}

export type ProIntent =
  | {
      kind: 'notify'
      client: ProClientRef
      entry: ProEntry
      /** Alternate entries for the same client (ambiguity). */
      alternateEntries: ProEntry[]
      denied: boolean
      denyReason: string | null
    }
  | {
      kind: 'deadline-reminder'
      client: ProClientRef
      entry: ProEntry | null
      deadlineLabel: string
      denied: boolean
      denyReason: string | null
    }
  | { kind: 'unknown'; query: string }

export type ProDraft = {
  toName: string
  subject: string
  body: string
  caseFileId: string
  href: string
  denied: boolean
  denyReason: string | null
  /** Chips shown above the draft so the user sees what was resolved. */
  resolution: {
    clientName: string
    matterLabel: string
    sourceName: string
    expedienteNumber: string | null
  }
  alternateMatters: Array<{ entryId: string; label: string }>
}

export type ProSuggestion = {
  id: string
  label: string
  query: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function cleanAcuerdoPlain(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .replace(/^Datos de demostración\.\s*/i, '')
    .replace(/\s*Datos de demostración\.?\s*$/i, '')
    .trim()
}

function findClient(query: string, clients: ProClientRef[]): ProClientRef | null {
  const q = normalize(query)
  for (const c of clients) {
    const short = normalize(c.name).split(',')[0] ?? normalize(c.name)
    const tokens = short.split(/\s+/).filter((t) => t.length > 3)
    if (q.includes(short) || tokens.some((t) => q.includes(t))) return c
  }
  if (q.includes('nexora')) return clients.find((c) => normalize(c.name).includes('nexora')) ?? null
  if (q.includes('farma') || q.includes('sierra'))
    return clients.find((c) => normalize(c.name).includes('farma')) ?? null
  if (q.includes('pedregal') || q.includes('fondo'))
    return clients.find((c) => normalize(c.name).includes('pedregal')) ?? null
  return null
}

function pickEntry(query: string, client: ProClientRef, preferredEntryId?: string): ProEntry {
  if (preferredEntryId) {
    const hit = client.entries.find((e) => e.id === preferredEntryId)
    if (hit) return hit
  }
  const q = normalize(query)
  for (const e of client.entries) {
    if (e.expedienteNumber && q.includes(normalize(e.expedienteNumber))) return e
    if (q.includes(normalize(e.courtName).slice(0, 12))) return e
  }
  return (
    client.entries[0] ?? {
      id: `${client.id}-fallback`,
      expedienteNumber: '—',
      courtName: 'el juzgado correspondiente',
      acuerdoPlain: 'un acuerdo publicado en la lista',
      publicationDateLabel: formatDateLongEs('2026-11-18'),
      sourceName: 'Boletín judicial (demostración)',
      matterLabel: client.name,
      caseFileId: client.caseFileId,
      matterId: client.matterId,
    }
  )
}

function abacDenied(
  role: ProPersonaRole,
  client: ProClientRef
): { denied: boolean; denyReason: string | null } {
  if (role !== 'pasante') return { denied: false, denyReason: null }
  if (client.allowedMatterIds === null) return { denied: false, denyReason: null }
  if (client.allowedMatterIds.includes(client.matterId)) {
    return { denied: false, denyReason: null }
  }
  return {
    denied: true,
    denyReason:
      'Su rol de pasante no puede redactar correos al cliente fuera de los asuntos que le asignaron.',
  }
}

export function parseProIntent(
  query: string,
  opts: {
    role: ProPersonaRole
    clients: ProClientRef[]
    preferredEntryId?: string
  }
): ProIntent {
  const q = normalize(query.trim())
  if (!q) return { kind: 'unknown', query }

  const client = findClient(query, opts.clients)
  const wantsNotify =
    q.includes('escrib') ||
    q.includes('avis') ||
    q.includes('notif') ||
    q.includes('correo') ||
    q.includes('mensaje')
  const wantsDeadline =
    q.includes('plazo') ||
    q.includes('recuerd') ||
    q.includes('vence') ||
    q.includes('deadline')

  if (!client) return { kind: 'unknown', query }

  const gate = abacDenied(opts.role, client)
  const entry = pickEntry(query, client, opts.preferredEntryId)
  const alternates = client.entries.filter((e) => e.id !== entry.id)

  if (wantsDeadline) {
    return {
      kind: 'deadline-reminder',
      client,
      entry,
      deadlineLabel: 'plazo próximo',
      denied: gate.denied,
      denyReason: gate.denyReason,
    }
  }

  // Notify when asked, or when the query names a client (default draft).
  if (wantsNotify || q.includes('auto') || q.includes('hoy') || Boolean(client)) {
    return {
      kind: 'notify',
      client,
      entry,
      alternateEntries: alternates,
      denied: gate.denied,
      denyReason: gate.denyReason,
    }
  }

  return { kind: 'unknown', query }
}

export function buildProDraft(intent: ProIntent): ProDraft | null {
  if (intent.kind === 'unknown') return null
  const client = intent.client
  const entry = intent.kind === 'notify' ? intent.entry : intent.entry
  const caseFileId = entry?.caseFileId ?? client.caseFileId
  const nextStep =
    intent.kind === 'deadline-reminder'
      ? 'Siguiente paso sugerido: confirmar el plazo en el expediente y, si procede, preparar el escrito con anticipación.'
      : 'Siguiente paso sugerido: revisar el acuerdo en el expediente y decidir si conviene informar al cliente o capturar una tarea interna.'

  if (intent.kind === 'notify' && entry) {
    const acuerdo = entry.acuerdoPlain
    return {
      toName: client.name,
      subject: `Publicación en expediente ${entry.expedienteNumber} — ${client.name}`,
      body: [
        `Estimados representantes de ${client.name}:`,
        '',
        `Les informamos, para su conocimiento, que el ${entry.publicationDateLabel} se publicó en ${entry.courtName}, expediente ${entry.expedienteNumber}, el siguiente acuerdo:`,
        '',
        `«${acuerdo}»`,
        '',
        nextStep,
        '',
        'Este texto es un borrador de demostración. La abogada o el abogado debe revisarlo y aprobarlo antes de cualquier envío. No se envía automáticamente.',
        '',
        'Atentamente,',
        'Despacho Altamirano y Asociados, S.C.',
        '',
        'Datos de demostración. Informativo: no constituye notificación judicial.',
      ].join('\n'),
      caseFileId,
      href: `/ciceron/expedientes/${caseFileId}?proDraft=1`,
      denied: intent.denied,
      denyReason: intent.denyReason,
      resolution: {
        clientName: client.name,
        matterLabel: entry.matterLabel,
        sourceName: entry.sourceName,
        expedienteNumber: entry.expedienteNumber,
      },
      alternateMatters: intent.alternateEntries.map((e) => ({
        entryId: e.id,
        label: `${e.expedienteNumber} · ${e.courtName}`,
      })),
    }
  }

  return {
    toName: client.name,
    subject: `Recordatorio de plazo — ${client.name}`,
    body: [
      `Estimados representantes de ${client.name}:`,
      '',
      entry
        ? `Les recordamos el plazo vinculado al expediente ${entry.expedienteNumber} (${entry.courtName}), publicado el ${entry.publicationDateLabel}.`
        : `Les recordamos que tienen un ${intent.kind === 'deadline-reminder' ? intent.deadlineLabel : 'plazo'} que conviene atender con tiempo.`,
      '',
      nextStep,
      '',
      'Este texto es un borrador de demostración. Debe ser revisado y aprobado por la abogada o el abogado. No se envía automáticamente.',
      '',
      'Atentamente,',
      'Despacho Altamirano y Asociados, S.C.',
      '',
      'Datos de demostración.',
    ].join('\n'),
    caseFileId,
    href: `/ciceron/expedientes/${caseFileId}?proDraft=1`,
    denied: intent.denied,
    denyReason: intent.denyReason,
    resolution: {
      clientName: client.name,
      matterLabel: entry?.matterLabel ?? client.name,
      sourceName: entry?.sourceName ?? 'Expediente interno',
      expedienteNumber: entry?.expedienteNumber ?? null,
    },
    alternateMatters: [],
  }
}

export function buildProSuggestions(input: {
  plazosSoonCount: number
  clientsMovedCount: number
  primaryClientName?: string
}): ProSuggestion[] {
  const short =
    (input.primaryClientName ?? 'Nexora').split(',')[0]?.trim().split(/\s+/)[0] ?? 'Nexora'
  const chips: ProSuggestion[] = []
  if (input.plazosSoonCount > 0) {
    chips.push({
      id: 'plazo',
      label:
        input.plazosSoonCount === 1
          ? 'Este plazo vence en 2 días, ¿preparo recordatorio?'
          : `Hay ${input.plazosSoonCount} plazos próximos, ¿preparo recordatorio?`,
      query: `recuérdame el plazo de ${short}`,
    })
  }
  if (input.clientsMovedCount > 0) {
    chips.push({
      id: 'avisar',
      label:
        input.clientsMovedCount === 1
          ? '1 cliente tuvo movimiento, ¿le aviso?'
          : `${input.clientsMovedCount} clientes tuvieron movimiento, ¿les aviso?`,
      query: `escríbele a ${short} sobre el auto de hoy`,
    })
  }
  chips.push({
    id: 'nexora',
    label: `Redactar aviso a ${short}`,
    query: `escríbele a ${short} sobre el auto de hoy`,
  })
  return chips
}

/** Demo client catalogue seeded with the real Querétaro / Nexora entry. */
export const PRO_DEMO_CLIENTS: ProClientRef[] = [
  {
    id: 'nexora',
    name: 'Nexora Pagos, S.A.P.I. de C.V.',
    allowedMatterIds: null,
    caseFileId: 'f1000000-0000-4000-8000-000000000021',
    matterId: 'nexora-cnbv',
    entries: [
      {
        id: 'hit-qro-1',
        expedienteNumber: '123/2026',
        courtName: 'Juzgado Primero Civil de Querétaro',
        acuerdoPlain: 'Se tiene por presentado el escrito de demanda',
        publicationDateLabel: formatDateLongEs('2026-11-18'),
        sourceName: 'Boletín judicial de Querétaro',
        matterLabel: 'Demanda mercantil 123/2026',
        caseFileId: 'f1000000-0000-4000-8000-000000000021',
        matterId: 'nexora-cnbv',
      },
      {
        id: 'hit-cdmx-nexora',
        expedienteNumber: '1001/2026',
        courtName: 'Juzgado Décimo de Distrito en Materia Civil',
        acuerdoPlain: 'Se ordena vista a la contraparte',
        publicationDateLabel: formatDateLongEs('2026-11-17'),
        sourceName: 'Boletín judicial de la Ciudad de México',
        matterLabel: 'Asunto federal 1001/2026',
        caseFileId: 'f1000000-0000-4000-8000-000000000021',
        matterId: 'nexora-cnbv',
      },
    ],
  },
  {
    id: 'farma',
    name: 'Distribuidora Farma Sierra, S.A. de C.V.',
    allowedMatterIds: null,
    caseFileId: 'f1000000-0000-4000-8000-000000000023',
    matterId: 'farma-cofepris',
    entries: [
      {
        id: 'hit-farma-1',
        expedienteNumber: '455/2026',
        courtName: 'Juzgado Segundo de Distrito en Materia Administrativa',
        acuerdoPlain: 'Se admite el recurso de revisión',
        publicationDateLabel: formatDateLongEs('2026-11-18'),
        sourceName: 'Boletín judicial federal',
        matterLabel: 'Recurso COFEPRIS 455/2026',
        caseFileId: 'f1000000-0000-4000-8000-000000000023',
        matterId: 'farma-cofepris',
      },
    ],
  },
  {
    id: 'fondo',
    name: 'Fondo Pedregal Inmuebles, S.A. de C.V.',
    allowedMatterIds: ['fondo-inmuebles'],
    caseFileId: 'f1000000-0000-4000-8000-000000000022',
    matterId: 'fondo-inmuebles',
    entries: [
      {
        id: 'hit-qro-2',
        expedienteNumber: '88/2025',
        courtName: 'Juzgado Segundo Familiar de Querétaro',
        acuerdoPlain: 'Se señala fecha de audiencia',
        publicationDateLabel: formatDateLongEs('2026-11-18'),
        sourceName: 'Boletín judicial de Querétaro',
        matterLabel: 'Audiencia familiar 88/2025',
        caseFileId: 'f1000000-0000-4000-8000-000000000022',
        matterId: 'fondo-inmuebles',
      },
    ],
  },
]

/**
 * Merge live bulletin hits into the demo catalogue (prefer live acuerdo text).
 */
export function mergeProClientsWithHits(
  base: ProClientRef[],
  hits: Array<{
    id: string
    clientName: string | null
    courtName: string | null
    expedienteNumber: string | null
    summary: string | null
    publicationDate: string | null
    caseFileId: string | null
    matterId: string | null
    stateName: string | null
  }>
): ProClientRef[] {
  const next = base.map((c) => ({ ...c, entries: [...c.entries] }))
  for (const h of hits) {
    const name = h.clientName?.trim()
    if (!name) continue
    const client =
      next.find((c) => normalize(c.name).includes(normalize(name).split(',')[0] ?? '')) ?? null
    if (!client) continue
    const entry: ProEntry = {
      id: h.id,
      expedienteNumber: h.expedienteNumber?.trim() || '—',
      courtName: h.courtName?.trim() || 'el juzgado correspondiente',
      acuerdoPlain:
        cleanAcuerdoPlain(h.summary) || 'un acuerdo publicado en la lista',
      publicationDateLabel: h.publicationDate
        ? formatDateLongEs(h.publicationDate)
        : formatDateLongEs('2026-11-18'),
      sourceName: h.stateName
        ? `Boletín judicial de ${h.stateName}`
        : 'Boletín judicial (demostración)',
      matterLabel: h.expedienteNumber
        ? `Expediente ${h.expedienteNumber}`
        : name,
      caseFileId: h.caseFileId ?? client.caseFileId,
      matterId: h.matterId ?? client.matterId,
    }
    const idx = client.entries.findIndex(
      (e) => e.expedienteNumber === entry.expedienteNumber
    )
    if (idx >= 0) client.entries[idx] = entry
    else client.entries.unshift(entry)
    if (h.caseFileId) client.caseFileId = h.caseFileId
  }
  return next
}
