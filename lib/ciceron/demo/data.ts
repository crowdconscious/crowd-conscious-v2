import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import {
  fixtureCases,
  fixtureClients,
  fixtureDeadlines,
  fixtureDofNotes,
  fixtureReviews,
  type ReviewState,
} from '@/lib/ciceron/demo/fixtures'

export type RoomSource = 'schema' | 'fixture'

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

function urgencyFromDue(dueAt: string): 'soon' | 'normal' {
  const due = new Date(dueAt).getTime()
  const days = (due - Date.now()) / (1000 * 60 * 60 * 24)
  return days <= 5 ? 'soon' : 'normal'
}

/** Matter ids the pasante may see; null means firm-wide (socio/asociado/admin). */
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

export type ClientView = {
  id: string
  name: string
  industry: string
  watch: string
  matters: { id: string; title: string }[]
}

export async function loadClientsRoom(persona: DemoPersona): Promise<{
  source: RoomSource
  clients: ClientView[]
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { source: 'fixture', clients: fixtureClients.map((c) => ({ ...c, matters: [...c.matters] })) }
  }

  try {
    const scope = await matterScope(persona)
    const clientsRes = await db
      .from('clients')
      .select('id, display_name, external_ref')
      .eq('firm_id', persona.firmId)
      .eq('is_demo', true)
      .order('display_name')

    if (clientsRes.error || !Array.isArray(clientsRes.data) || clientsRes.data.length === 0) {
      return { source: 'fixture', clients: fixtureClients.map((c) => ({ ...c, matters: [...c.matters] })) }
    }

    const mattersRes = await db
      .from('matters')
      .select('id, client_id, title')
      .eq('firm_id', persona.firmId)
      .eq('is_demo', true)

    const watchesRes = await db
      .from('watch_profiles')
      .select('client_id, description')
      .eq('is_demo', true)

    const matters = (Array.isArray(mattersRes.data) ? mattersRes.data : []) as {
      id: string
      client_id: string
      title: string
    }[]
    const watches = (Array.isArray(watchesRes.data) ? watchesRes.data : []) as {
      client_id: string
      description: string
    }[]

    const clients: ClientView[] = (clientsRes.data as {
      id: string
      display_name: string
      external_ref: string | null
    }[])
      .map((c) => {
        let clientMatters = matters.filter((m) => m.client_id === c.id)
        if (scope) {
          clientMatters = clientMatters.filter((m) => scope.includes(m.id))
        }
        const watch = watches.find((w) => w.client_id === c.id)?.description ?? ''
        return {
          id: c.id,
          name: c.display_name,
          industry: c.external_ref ?? '',
          watch: watch.replace(/^Datos de demostración\.\s*/i, ''),
          matters: clientMatters.map((m) => ({ id: m.id, title: m.title })),
        }
      })
      .filter((c) => (scope ? c.matters.length > 0 : true))

    if (clients.length === 0) {
      return { source: 'fixture', clients: fixtureClients.map((c) => ({ ...c, matters: [...c.matters] })) }
    }

    return { source: 'schema', clients }
  } catch {
    return { source: 'fixture', clients: fixtureClients.map((c) => ({ ...c, matters: [...c.matters] })) }
  }
}

export type CaseView = {
  id: string
  clientName: string
  matterTitle: string
  court: string
  fileNumber: string
  lastEvent: string
  nextDeadline: string
  urgency: 'soon' | 'normal'
}

export async function loadCasesRoom(persona: DemoPersona): Promise<{
  source: RoomSource
  cases: CaseView[]
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { source: 'fixture', cases: fixtureCases.map((c) => ({ ...c })) }
  }

  try {
    const scope = await matterScope(persona)
    let casesQuery = db
      .from('case_files')
      .select('id, matter_id, court_name, file_number, is_sample')
      .eq('firm_id', persona.firmId)
      .eq('is_sample', true)

    const casesRes = await casesQuery
    if (casesRes.error || !Array.isArray(casesRes.data) || casesRes.data.length === 0) {
      return { source: 'fixture', cases: fixtureCases.map((c) => ({ ...c })) }
    }

    let rows = casesRes.data as {
      id: string
      matter_id: string
      court_name: string | null
      file_number: string | null
    }[]
    if (scope) rows = rows.filter((r) => scope.includes(r.matter_id))

    const matterIds = [...new Set(rows.map((r) => r.matter_id))]
    const mattersRes = await db
      .from('matters')
      .select('id, title, client_id')
      .eq('firm_id', persona.firmId)
      .in('id', matterIds)

    const matters = (Array.isArray(mattersRes.data) ? mattersRes.data : []) as {
      id: string
      title: string
      client_id: string
    }[]
    const clientIds = [...new Set(matters.map((m) => m.client_id))]
    const clientsRes = await db
      .from('clients')
      .select('id, display_name')
      .eq('firm_id', persona.firmId)
      .in('id', clientIds)

    const clients = (Array.isArray(clientsRes.data) ? clientsRes.data : []) as {
      id: string
      display_name: string
    }[]

    const caseIds = rows.map((r) => r.id)
    const eventsRes = await db
      .from('case_events')
      .select('case_file_id, summary, occurred_at')
      .in('case_file_id', caseIds)
      .order('occurred_at', { ascending: false })

    const events = (Array.isArray(eventsRes.data) ? eventsRes.data : []) as {
      case_file_id: string
      summary: string
      occurred_at: string
    }[]

    const deadlinesRes = await db
      .from('deadlines')
      .select('case_file_id, due_at, status')
      .in('case_file_id', caseIds)
      .order('due_at', { ascending: true })

    const deadlines = (Array.isArray(deadlinesRes.data) ? deadlinesRes.data : []) as {
      case_file_id: string
      due_at: string
      status: string
    }[]

    const cases: CaseView[] = rows.map((r) => {
      const matter = matters.find((m) => m.id === r.matter_id)
      const client = clients.find((c) => c.id === matter?.client_id)
      const last = events.find((e) => e.case_file_id === r.id)
      const dl = deadlines.find((d) => d.case_file_id === r.id)
      return {
        id: r.id,
        clientName: client?.display_name ?? '—',
        matterTitle: matter?.title ?? '—',
        court: r.court_name ?? '—',
        fileNumber: r.file_number ?? '—',
        lastEvent: last?.summary?.replace(/^Datos de demostración\.\s*/i, '') ?? 'Sin actuaciones',
        nextDeadline: dl ? formatEsDate(dl.due_at) : '—',
        urgency: dl ? urgencyFromDue(dl.due_at) : 'normal',
      }
    })

    return { source: 'schema', cases }
  } catch {
    return { source: 'fixture', cases: fixtureCases.map((c) => ({ ...c })) }
  }
}

export type DeadlineView = {
  id: string
  label: string
  due: string
  clientName: string
  urgency: 'soon' | 'normal'
}

export async function loadDeadlines(persona: DemoPersona): Promise<{
  source: RoomSource
  deadlines: DeadlineView[]
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { source: 'fixture', deadlines: fixtureDeadlines.map((d) => ({ ...d })) }
  }

  try {
    const scope = await matterScope(persona)
    const { data, error } = await db
      .from('deadlines')
      .select('id, due_at, basis_text, case_file_id, matter_id, status')
      .order('due_at', { ascending: true })
      .limit(20)

    if (error || !Array.isArray(data) || data.length === 0) {
      return { source: 'fixture', deadlines: fixtureDeadlines.map((d) => ({ ...d })) }
    }

    let rows = data as {
      id: string
      due_at: string
      basis_text: string | null
      case_file_id: string | null
      matter_id: string
      status: string
    }[]

    // Firm scope via matters
    const mattersRes = await db
      .from('matters')
      .select('id, client_id, title')
      .eq('firm_id', persona.firmId)
    const firmMatters = (Array.isArray(mattersRes.data) ? mattersRes.data : []) as {
      id: string
      client_id: string
      title: string
    }[]
    const firmMatterIds = new Set(firmMatters.map((m) => m.id))
    rows = rows.filter((r) => firmMatterIds.has(r.matter_id))
    if (scope) rows = rows.filter((r) => scope.includes(r.matter_id))

    const clientIds = [
      ...new Set(
        rows
          .map((r) => firmMatters.find((m) => m.id === r.matter_id)?.client_id)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    const clientsRes = await db
      .from('clients')
      .select('id, display_name')
      .eq('firm_id', persona.firmId)
      .in('id', clientIds)
    const clients = (Array.isArray(clientsRes.data) ? clientsRes.data : []) as {
      id: string
      display_name: string
    }[]

    const caseIds = rows.map((r) => r.case_file_id).filter((id): id is string => Boolean(id))
    const casesRes =
      caseIds.length > 0
        ? await db.from('case_files').select('id, file_number').in('id', caseIds)
        : { data: [], error: null }
    const cases = (Array.isArray(casesRes.data) ? casesRes.data : []) as {
      id: string
      file_number: string | null
    }[]

    const deadlines: DeadlineView[] = rows.map((r) => {
      const matter = firmMatters.find((m) => m.id === r.matter_id)
      const client = clients.find((c) => c.id === matter?.client_id)
      const file = cases.find((c) => c.id === r.case_file_id)
      const label = file?.file_number
        ? `Contestar demanda — ${file.file_number}`
        : (r.basis_text?.slice(0, 80) ?? 'Plazo')
      return {
        id: r.id,
        label,
        due: formatEsDate(r.due_at),
        clientName: client?.display_name ?? '—',
        urgency: urgencyFromDue(r.due_at),
      }
    })

    if (deadlines.length === 0) {
      return { source: 'fixture', deadlines: fixtureDeadlines.map((d) => ({ ...d })) }
    }
    return { source: 'schema', deadlines }
  } catch {
    return { source: 'fixture', deadlines: fixtureDeadlines.map((d) => ({ ...d })) }
  }
}

/** DOF / reviews not seeded yet — fixtures until Prompt 3/4 pipelines. */
export async function loadDofNotes(_persona: DemoPersona) {
  return {
    source: 'fixture' as const,
    notes: fixtureDofNotes.map((n) => ({ ...n })),
  }
}

export async function loadReviews(_persona: DemoPersona) {
  return {
    source: 'fixture' as const,
    reviews: fixtureReviews.map((r) => ({
      ...r,
      state: r.state as ReviewState,
    })),
  }
}
