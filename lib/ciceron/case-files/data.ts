import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { fixtureCases } from '@/lib/ciceron/demo/fixtures'
import {
  fixtureCaseDetails,
  SCHEMA_CASE_TO_FIXTURE,
  type CaseDetailView,
  type CaseDeadlineView,
  type CaseEventView,
} from '@/lib/ciceron/case-files/fixtures-detail'
import { readM365CookieStatus } from '@/lib/ciceron/m365/demo-store'
import {
  fixtureArchiveDocs,
  fixtureOutlookEvents,
} from '@/lib/ciceron/m365/fixtures'
import type {
  ArchiveDoc,
  M365ConnectionStatus,
  OutlookCalendarEvent,
} from '@/lib/ciceron/m365/types'
import type { RoomSource } from '@/lib/ciceron/demo/data'

function formatEsDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  })
}

function urgencyFromDue(dueAt: string): 'urgent' | 'soon' | 'normal' {
  const days = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'soon'
  return 'normal'
}

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    err.code === '42P01' ||
    err.code === 'PGRST205'
  )
}

async function matterScope(persona: DemoPersona): Promise<string[] | null> {
  if (persona.role !== 'pasante') return null
  const db = tryCreateCiceronAdminClient()
  if (!db) return []
  const { data, error } = await db
    .from('matter_members')
    .select('matter_id')
    .eq('user_id', persona.id)
  if (error || !Array.isArray(data)) return []
  return data.map((r) => (r as { matter_id: string }).matter_id)
}

export type CaseListFilters = {
  clientId?: string
  lawyer?: string
  urgency?: 'urgent' | 'soon' | 'normal' | ''
  q?: string
}

export type CaseListRow = {
  id: string
  clientName: string
  clientId: string
  matterTitle: string
  matterId: string
  court: string
  fileNumber: string
  lastEvent: string
  nextDeadline: string
  nextDeadlineAt: string | null
  urgency: 'urgent' | 'soon' | 'normal'
  lawyerName: string
}

export async function loadCaseList(
  persona: DemoPersona,
  filters: CaseListFilters = {}
): Promise<{ source: RoomSource; cases: CaseListRow[]; schemaReady: boolean }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return {
      source: 'fixture',
      schemaReady: false,
      cases: filterCaseRows(fixtureListRows(), filters),
    }
  }

  try {
    const scope = await matterScope(persona)
    const casesRes = await db
      .from('case_files')
      .select('id, matter_id, court_name, file_number, is_sample, status')
      .eq('firm_id', persona.firmId)
      .eq('is_sample', true)

    if (casesRes.error || !Array.isArray(casesRes.data) || casesRes.data.length === 0) {
      return {
        source: 'fixture',
        schemaReady: !isMissingRelation(casesRes.error),
        cases: filterCaseRows(fixtureListRows(), filters),
      }
    }

    let rows = casesRes.data as Array<{
      id: string
      matter_id: string
      court_name: string | null
      file_number: string | null
    }>
    if (scope) rows = rows.filter((r) => scope.includes(r.matter_id))

    const matterIds = [...new Set(rows.map((r) => r.matter_id))]
    const mattersRes = await db
      .from('matters')
      .select('id, title, client_id')
      .eq('firm_id', persona.firmId)
      .in('id', matterIds)
    const matters = (Array.isArray(mattersRes.data) ? mattersRes.data : []) as Array<{
      id: string
      title: string
      client_id: string
    }>
    const clientIds = [...new Set(matters.map((m) => m.client_id))]
    const clientsRes = await db
      .from('clients')
      .select('id, display_name')
      .eq('firm_id', persona.firmId)
      .in('id', clientIds)
    const clients = (Array.isArray(clientsRes.data) ? clientsRes.data : []) as Array<{
      id: string
      display_name: string
    }>

    const caseIds = rows.map((r) => r.id)
    const eventsRes = await db
      .from('case_events')
      .select('case_file_id, summary, occurred_at')
      .in('case_file_id', caseIds)
      .order('occurred_at', { ascending: false })
    const events = (Array.isArray(eventsRes.data) ? eventsRes.data : []) as Array<{
      case_file_id: string
      summary: string
      occurred_at: string
    }>

    const deadlinesRes = await db
      .from('deadlines')
      .select('case_file_id, due_at, status')
      .in('case_file_id', caseIds)
      .in('status', ['propuesto', 'confirmado'])
      .order('due_at', { ascending: true })
    const deadlines = (Array.isArray(deadlinesRes.data) ? deadlinesRes.data : []) as Array<{
      case_file_id: string
      due_at: string
      status: string
    }>

    const cases: CaseListRow[] = rows.map((r) => {
      const matter = matters.find((m) => m.id === r.matter_id)
      const client = clients.find((c) => c.id === matter?.client_id)
      const last = events.find((e) => e.case_file_id === r.id)
      const dl = deadlines.find((d) => d.case_file_id === r.id)
      return {
        id: r.id,
        clientName: client?.display_name ?? '—',
        clientId: client?.id ?? '',
        matterTitle: matter?.title ?? '—',
        matterId: r.matter_id,
        court: r.court_name ?? '—',
        fileNumber: r.file_number ?? '—',
        lastEvent:
          last?.summary?.replace(/^Datos de demostración\.\s*/i, '') ?? 'Sin actuaciones',
        nextDeadline: dl ? formatEsDate(dl.due_at) : '—',
        nextDeadlineAt: dl?.due_at ?? null,
        urgency: dl ? urgencyFromDue(dl.due_at) : 'normal',
        lawyerName: '—',
      }
    })

    return {
      source: 'schema',
      schemaReady: true,
      cases: filterCaseRows(cases, filters),
    }
  } catch {
    return {
      source: 'fixture',
      schemaReady: false,
      cases: filterCaseRows(fixtureListRows(), filters),
    }
  }
}

function fixtureListRows(): CaseListRow[] {
  return fixtureCases.map((c) => ({
    id: c.id,
    clientName: c.clientName,
    clientId: c.id === 'case-1' ? 'nexora' : 'viento',
    matterTitle: c.matterTitle,
    matterId: c.id === 'case-1' ? 'nexora-cnbv' : 'viento-cre',
    court: c.court,
    fileNumber: c.fileNumber,
    lastEvent: c.lastEvent,
    nextDeadline: c.nextDeadline,
    nextDeadlineAt: null,
    urgency: c.urgency === 'soon' ? 'soon' : 'normal',
    lawyerName: c.id === 'case-1' ? 'Asociado Demo Herrera' : 'Socia Demo Rivera',
  }))
}

function filterCaseRows(rows: CaseListRow[], filters: CaseListFilters): CaseListRow[] {
  let out = rows
  if (filters.clientId) {
    out = out.filter(
      (r) =>
        r.clientId === filters.clientId ||
        r.clientName.toLowerCase().includes(filters.clientId!.toLowerCase())
    )
  }
  if (filters.urgency) {
    out = out.filter((r) => r.urgency === filters.urgency)
  }
  if (filters.q) {
    const q = filters.q.toLowerCase()
    out = out.filter(
      (r) =>
        r.fileNumber.toLowerCase().includes(q) ||
        r.court.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.matterTitle.toLowerCase().includes(q)
    )
  }
  if (filters.lawyer) {
    const l = filters.lawyer.toLowerCase()
    out = out.filter((r) => r.lawyerName.toLowerCase().includes(l))
  }
  return out
}

export async function loadCaseDetail(
  persona: DemoPersona,
  caseId: string
): Promise<{ source: RoomSource; detail: CaseDetailView | null; schemaReady: boolean }> {
  const fixtureKey = SCHEMA_CASE_TO_FIXTURE[caseId] ?? caseId
  const fixture = fixtureCaseDetails[fixtureKey] ?? null

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { source: 'fixture', detail: fixture, schemaReady: false }
  }

  try {
    const scope = await matterScope(persona)
    const { data, error } = await db
      .from('case_files')
      .select('id, matter_id, court_name, file_number, status, is_sample, firm_id')
      .eq('id', caseId)
      .eq('firm_id', persona.firmId)
      .maybeSingle()

    if (error || !data) {
      return {
        source: 'fixture',
        detail: fixture,
        schemaReady: !isMissingRelation(error),
      }
    }

    const cf = data as {
      id: string
      matter_id: string
      court_name: string | null
      file_number: string | null
      status: string
    }
    if (scope && !scope.includes(cf.matter_id)) {
      return { source: 'schema', detail: null, schemaReady: true }
    }

    const matterRes = await db
      .from('matters')
      .select('id, title, client_id')
      .eq('id', cf.matter_id)
      .maybeSingle()
    const matter = matterRes.data as { id: string; title: string; client_id: string } | null
    const clientRes = matter
      ? await db
          .from('clients')
          .select('id, display_name')
          .eq('id', matter.client_id)
          .maybeSingle()
      : { data: null }
    const client = clientRes.data as { id: string; display_name: string } | null

    const eventsRes = await db
      .from('case_events')
      .select(
        'id, event_type, occurred_at, summary, ai_summary, event_text, original_storage_path, is_sample'
      )
      .eq('case_file_id', caseId)
      .order('occurred_at', { ascending: true })

    const eventsMissing = isMissingRelation(eventsRes.error)
    const eventRows = (Array.isArray(eventsRes.data) ? eventsRes.data : []) as Array<{
      id: string
      event_type: string
      occurred_at: string
      summary: string | null
      ai_summary?: string | null
      event_text?: string | null
      original_storage_path?: string | null
    }>

    const events: CaseEventView[] =
      eventRows.length > 0 && !eventsMissing
        ? eventRows.map((e) => ({
            id: e.id,
            eventType: e.event_type,
            occurredAt: e.occurred_at,
            occurredLabel: formatEsDate(e.occurred_at),
            summary: (e.summary ?? '').replace(/^Datos de demostración\.\s*/i, ''),
            aiSummary:
              e.ai_summary?.trim() ||
              ((e.summary ?? '').replace(/^Datos de demostración\.\s*/i, '').slice(0, 200) ||
                'Resumen pendiente.'),
            text: e.event_text || e.summary || '',
            originalLabel: e.original_storage_path
              ? 'Original en archivo del despacho'
              : 'Original de demostración',
            hasOriginal: true,
            isSample: true,
          }))
        : fixture?.events ?? []

    const dlRes = await db
      .from('deadlines')
      .select(
        'id, due_at, status, basis_text, computation_text, confirmed_by, confirmed_at, is_sample'
      )
      .eq('case_file_id', caseId)
      .order('due_at', { ascending: true })

    const dlMissing = isMissingRelation(dlRes.error)
    const dlRows = (Array.isArray(dlRes.data) ? dlRes.data : []) as Array<{
      id: string
      due_at: string
      status: 'propuesto' | 'confirmado' | 'descartado'
      basis_text: string | null
      computation_text?: string | null
      confirmed_by?: string | null
      confirmed_at?: string | null
    }>

    const deadlines: CaseDeadlineView[] =
      dlRows.length > 0 && !dlMissing
        ? dlRows.map((d) => ({
            id: d.id,
            dueLabel: formatEsDate(d.due_at),
            dueAt: d.due_at,
            status: d.status,
            basisText: d.basis_text ?? '',
            computationText: d.computation_text ?? d.basis_text ?? '',
            confirmedBy: d.confirmed_by ?? null,
            confirmedAt: d.confirmed_at ? formatEsDate(d.confirmed_at) : null,
            urgency: urgencyFromDue(d.due_at),
            isSample: true,
          }))
        : fixture?.deadlines ?? []

    return {
      source: 'schema',
      schemaReady: true,
      detail: {
        id: cf.id,
        clientName: client?.display_name ?? fixture?.clientName ?? '—',
        clientId: client?.id ?? '',
        matterId: cf.matter_id,
        matterTitle: matter?.title ?? fixture?.matterTitle ?? '—',
        court: cf.court_name ?? '—',
        fileNumber: cf.file_number ?? '—',
        status: cf.status,
        lawyerName: fixture?.lawyerName ?? '—',
        events,
        deadlines,
        isSample: true,
      },
    }
  } catch {
    return { source: 'fixture', detail: fixture, schemaReady: false }
  }
}

export async function loadM365Status(
  persona: DemoPersona
): Promise<{ status: M365ConnectionStatus; source: RoomSource }> {
  const cookieStatus = await readM365CookieStatus()
  const db = tryCreateCiceronAdminClient()
  if (!db) return { status: cookieStatus, source: 'fixture' }
  try {
    const { data, error } = await db
      .from('firm_integrations')
      .select('status')
      .eq('firm_id', persona.firmId)
      .eq('provider', 'microsoft365_sim')
      .maybeSingle()
    if (error || !data) {
      return {
        status: cookieStatus,
        source: isMissingRelation(error) ? 'fixture' : 'schema',
      }
    }
    const status = (data as { status: M365ConnectionStatus }).status
    return { status: status === 'connected' ? 'connected' : cookieStatus === 'connected' ? 'connected' : 'disconnected', source: 'schema' }
  } catch {
    return { status: cookieStatus, source: 'fixture' }
  }
}

export async function loadArchiveDocs(
  persona: DemoPersona
): Promise<{ source: RoomSource; docs: ArchiveDoc[] }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return { source: 'fixture', docs: [...fixtureArchiveDocs] }
  try {
    const { data, error } = await db
      .from('firm_archive_items')
      .select('id, document_id, folder_path, doc_date, parties, is_sample')
      .eq('firm_id', persona.firmId)
      .eq('is_sample', true)
    if (error || !Array.isArray(data) || data.length === 0) {
      return { source: 'fixture', docs: [...fixtureArchiveDocs] }
    }
    const items = data as Array<{
      id: string
      document_id: string
      folder_path: string
      doc_date: string | null
      parties: string | null
    }>
    const docIds = items.map((i) => i.document_id)
    const docsRes = await db.from('documents').select('id, title').in('id', docIds)
    const docsMap = new Map(
      ((Array.isArray(docsRes.data) ? docsRes.data : []) as Array<{ id: string; title: string | null }>).map(
        (d) => [d.id, d.title]
      )
    )
    const versionsRes = await db
      .from('document_versions')
      .select('id, document_id')
      .in('document_id', docIds)
    const versionIds = (Array.isArray(versionsRes.data) ? versionsRes.data : []) as Array<{
      id: string
      document_id: string
    }>
    const chunksRes = await db
      .from('chunks')
      .select('id, version_id, text, position')
      .in(
        'version_id',
        versionIds.map((v) => v.id)
      )
      .eq('position', 0)
    const chunks = (Array.isArray(chunksRes.data) ? chunksRes.data : []) as Array<{
      id: string
      version_id: string
      text: string
    }>
    const versionToDoc = new Map(versionIds.map((v) => [v.id, v.document_id]))
    const chunkByDoc = new Map<string, { id: string; text: string }>()
    for (const c of chunks) {
      const docId = versionToDoc.get(c.version_id)
      if (docId && !chunkByDoc.has(docId)) chunkByDoc.set(docId, { id: c.id, text: c.text })
    }

    return {
      source: 'schema',
      docs: items.map((i) => {
        const chunk = chunkByDoc.get(i.document_id)
        return {
          id: i.id,
          documentId: i.document_id,
          title: docsMap.get(i.document_id) ?? 'Documento',
          folderPath: i.folder_path,
          docDate: i.doc_date ?? '—',
          parties: i.parties ?? '',
          excerpt: (chunk?.text ?? '').slice(0, 280),
          chunkId: chunk?.id ?? i.document_id,
          isSample: true as const,
        }
      }),
    }
  } catch {
    return { source: 'fixture', docs: [...fixtureArchiveDocs] }
  }
}

export async function loadOutlookCalendar(
  persona: DemoPersona,
  opts: { lawyerId?: string } = {}
): Promise<{ source: RoomSource; events: OutlookCalendarEvent[] }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    let events = [...fixtureOutlookEvents]
    if (opts.lawyerId) {
      events = events.filter((e) =>
        (e.lawyerName || '').toLowerCase().includes(opts.lawyerId!.toLowerCase())
      )
    }
    return { source: 'fixture', events }
  }
  try {
    let q = db
      .from('simulated_calendar_events')
      .select(
        'id, title, starts_at, ends_at, event_kind, client_id, matter_id, case_file_id, lawyer_user_id, synced_from_ciceron, is_sample'
      )
      .eq('firm_id', persona.firmId)
      .eq('is_sample', true)
      .order('starts_at', { ascending: true })
    if (opts.lawyerId) q = q.eq('lawyer_user_id', opts.lawyerId)
    const { data, error } = await q
    if (error || !Array.isArray(data) || data.length === 0) {
      return { source: 'fixture', events: [...fixtureOutlookEvents] }
    }
    const rows = data as Array<{
      id: string
      title: string
      starts_at: string
      ends_at: string | null
      event_kind: OutlookCalendarEvent['eventKind']
      client_id: string | null
      matter_id: string | null
      case_file_id: string | null
      lawyer_user_id: string | null
      synced_from_ciceron: boolean
    }>

    const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))] as string[]
    const clientsRes = clientIds.length
      ? await db.from('clients').select('id, display_name').in('id', clientIds)
      : { data: [] }
    const clients = new Map(
      ((Array.isArray(clientsRes.data) ? clientsRes.data : []) as Array<{
        id: string
        display_name: string
      }>).map((c) => [c.id, c.display_name])
    )

    const matterIds = [...new Set(rows.map((r) => r.matter_id).filter(Boolean))] as string[]
    const mattersRes = matterIds.length
      ? await db.from('matters').select('id, title').in('id', matterIds)
      : { data: [] }
    const matters = new Map(
      ((Array.isArray(mattersRes.data) ? mattersRes.data : []) as Array<{
        id: string
        title: string
      }>).map((m) => [m.id, m.title])
    )

    const caseIds = [...new Set(rows.map((r) => r.case_file_id).filter(Boolean))] as string[]
    const casesRes = caseIds.length
      ? await db.from('case_files').select('id, file_number').in('id', caseIds)
      : { data: [] }
    const cases = new Map(
      ((Array.isArray(casesRes.data) ? casesRes.data : []) as Array<{
        id: string
        file_number: string | null
      }>).map((c) => [c.id, c.file_number])
    )

    // Merge confirmed Cicéron deadlines as calendar items when present
    const dlRes = await db
      .from('deadlines')
      .select('id, due_at, basis_text, case_file_id, matter_id, status')
      .eq('status', 'confirmado')
      .order('due_at', { ascending: true })
      .limit(40)
    const confirmed = (Array.isArray(dlRes.data) ? dlRes.data : []) as Array<{
      id: string
      due_at: string
      basis_text: string | null
      case_file_id: string | null
      matter_id: string
    }>

    const events: OutlookCalendarEvent[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      eventKind: r.event_kind,
      clientName: r.client_id ? clients.get(r.client_id) ?? null : null,
      lawyerName: null,
      matterTitle: r.matter_id ? matters.get(r.matter_id) ?? null : null,
      caseFileNumber: r.case_file_id ? cases.get(r.case_file_id) ?? null : null,
      syncedFromCiceron: r.synced_from_ciceron,
      isSample: true,
    }))

    for (const d of confirmed) {
      events.push({
        id: `dl-${d.id}`,
        title: `Plazo confirmado — ${(d.basis_text || 'plazo').slice(0, 80)}`,
        startsAt: d.due_at,
        endsAt: null,
        eventKind: 'deadline',
        clientName: null,
        lawyerName: null,
        matterTitle: matters.get(d.matter_id) ?? null,
        caseFileNumber: d.case_file_id ? cases.get(d.case_file_id) ?? null : null,
        syncedFromCiceron: true,
        isSample: true,
      })
    }

    events.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    return { source: 'schema', events }
  } catch {
    return { source: 'fixture', events: [...fixtureOutlookEvents] }
  }
}
