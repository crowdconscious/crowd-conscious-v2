/**
 * Deterministic Pro assistant intent parser (demo). Never sends email.
 * Optional LLM path is behind a flag that defaults OFF.
 */

export const PRO_ASSISTANT_LLM_FLAG = 'CICERON_PRO_ASSISTANT_LLM'
/** Demo flag — always false unless explicitly enabled in env (callers check). */
export function isProAssistantLlmEnabled(
  env: Record<string, string | undefined> = {}
): boolean {
  return env[PRO_ASSISTANT_LLM_FLAG] === '1' || env[PRO_ASSISTANT_LLM_FLAG] === 'true'
}

export type ProPersonaRole = 'socio' | 'asociado' | 'pasante' | 'coordinador' | 'admin'

export type ProClientRef = {
  id: string
  name: string
  /** Matter ids the pasante may access; null = firm-wide. */
  allowedMatterIds: string[] | null
  caseFileId: string
  matterId: string
}

export type ProIntent =
  | {
      kind: 'notify'
      client: ProClientRef
      topic: string
      denied: boolean
      denyReason: string | null
    }
  | {
      kind: 'deadline-reminder'
      client: ProClientRef
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

function findClient(query: string, clients: ProClientRef[]): ProClientRef | null {
  const q = normalize(query)
  for (const c of clients) {
    const short = normalize(c.name).split(',')[0] ?? normalize(c.name)
    const tokens = short.split(/\s+/).filter((t) => t.length > 3)
    if (q.includes(short) || tokens.some((t) => q.includes(t))) return c
  }
  // Common demo nicknames
  if (q.includes('nexora')) return clients.find((c) => normalize(c.name).includes('nexora')) ?? null
  if (q.includes('farma') || q.includes('sierra'))
    return clients.find((c) => normalize(c.name).includes('farma')) ?? null
  if (q.includes('pedregal') || q.includes('fondo'))
    return clients.find((c) => normalize(c.name).includes('pedregal')) ?? null
  return null
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

  if (client && wantsDeadline) {
    const gate = abacDenied(opts.role, client)
    return {
      kind: 'deadline-reminder',
      client,
      deadlineLabel: 'plazo próximo',
      denied: gate.denied,
      denyReason: gate.denyReason,
    }
  }

  if (client && (wantsNotify || q.includes('auto') || q.includes('hoy'))) {
    const gate = abacDenied(opts.role, client)
    return {
      kind: 'notify',
      client,
      topic: q.includes('auto') ? 'el auto de hoy' : 'la novedad de hoy',
      denied: gate.denied,
      denyReason: gate.denyReason,
    }
  }

  if (client) {
    const gate = abacDenied(opts.role, client)
    return {
      kind: 'notify',
      client,
      topic: 'la novedad reciente',
      denied: gate.denied,
      denyReason: gate.denyReason,
    }
  }

  return { kind: 'unknown', query }
}

export function buildProDraft(intent: ProIntent): ProDraft | null {
  if (intent.kind === 'unknown') return null
  const client = intent.client
  if (intent.kind === 'notify') {
    return {
      toName: client.name,
      subject: `Información sobre ${intent.topic} — ${client.name}`,
      body: [
        `Estimados representantes de ${client.name}:`,
        '',
        `Les informamos, para su conocimiento, sobre ${intent.topic} en el expediente que llevamos en su representación.`,
        '',
        'Este texto es un borrador de demostración. La abogada o el abogado debe revisarlo y aprobarlo antes de cualquier envío. No se envía automáticamente.',
        '',
        'Atentamente,',
        'Despacho Altamirano y Asociados, S.C.',
        '',
        'Datos de demostración. Informativo: no constituye notificación judicial.',
      ].join('\n'),
      caseFileId: client.caseFileId,
      href: `/ciceron/expedientes/${client.caseFileId}?proDraft=1`,
      denied: intent.denied,
      denyReason: intent.denyReason,
    }
  }
  return {
    toName: client.name,
    subject: `Recordatorio de plazo — ${client.name}`,
    body: [
      `Estimados representantes de ${client.name}:`,
      '',
      `Les recordamos que tienen un ${intent.deadlineLabel} que conviene atender con tiempo.`,
      '',
      'Este texto es un borrador de demostración. Debe ser revisado y aprobado por la abogada o el abogado. No se envía automáticamente.',
      '',
      'Atentamente,',
      'Despacho Altamirano y Asociados, S.C.',
      '',
      'Datos de demostración.',
    ].join('\n'),
    caseFileId: client.caseFileId,
    href: `/ciceron/expedientes/${client.caseFileId}?proDraft=1`,
    denied: intent.denied,
    denyReason: intent.denyReason,
  }
}

export function buildProSuggestions(input: {
  plazosSoonCount: number
  clientsMovedCount: number
}): ProSuggestion[] {
  const chips: ProSuggestion[] = []
  if (input.plazosSoonCount > 0) {
    chips.push({
      id: 'plazo',
      label:
        input.plazosSoonCount === 1
          ? 'Este plazo vence en 2 días, ¿preparo recordatorio?'
          : `Hay ${input.plazosSoonCount} plazos próximos, ¿preparo recordatorio?`,
      query: 'recuérdame el plazo de Farma Sierra',
    })
  }
  if (input.clientsMovedCount > 0) {
    chips.push({
      id: 'avisar',
      label:
        input.clientsMovedCount === 1
          ? '1 cliente tuvo movimiento, ¿le aviso?'
          : `${input.clientsMovedCount} clientes tuvieron movimiento, ¿les aviso?`,
      query: 'escríbele a Nexora sobre el auto de hoy',
    })
  }
  chips.push({
    id: 'nexora',
    label: 'Redactar aviso a Nexora',
    query: 'escríbele a Nexora sobre el auto de hoy',
  })
  return chips
}

/** Demo client catalogue for the intent parser. */
export const PRO_DEMO_CLIENTS: ProClientRef[] = [
  {
    id: 'nexora',
    name: 'Nexora Pagos, S.A.P.I. de C.V.',
    allowedMatterIds: null,
    caseFileId: 'case-1',
    matterId: 'nexora-cnbv',
  },
  {
    id: 'farma',
    name: 'Distribuidora Farma Sierra, S.A. de C.V.',
    allowedMatterIds: null,
    caseFileId: 'case-1',
    matterId: 'farma-cofepris',
  },
  {
    id: 'fondo',
    name: 'Fondo Pedregal Inmuebles, S.A. de C.V.',
    allowedMatterIds: ['fondo-inmuebles'],
    caseFileId: 'case-1',
    matterId: 'fondo-inmuebles',
  },
]
