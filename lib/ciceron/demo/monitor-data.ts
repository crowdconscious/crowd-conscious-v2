import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import {
  fixtureDofNotes,
  fixtureReviews,
  type ReviewState,
} from '@/lib/ciceron/demo/fixtures'
import { officialDofUrl } from '@/lib/ciceron/dof/dates'

export type MonitorItem = {
  id: string
  matchId: string
  noteId: string
  title: string
  clientName: string
  clientId: string
  reason: string
  action: string
  passage: string
  authority: string
  type: string
  date: string
  dateIso: string
  officialUrl: string
  review: ReviewState
  subjectAreas: string[]
  feedback: 'relevante' | 'no_relevante' | null
}

function formatEsDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  })
}

export async function loadMonitorMatches(
  persona: DemoPersona,
  filters?: {
    clientId?: string | null
    subjectArea?: string | null
    authority?: string | null
    documentType?: string | null
    onlyMine?: boolean
  }
): Promise<{ source: 'schema' | 'fixture'; items: MonitorItem[]; totalClassified: number }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return {
      source: 'fixture',
      items: fixtureDofNotes.map((n) => ({
        id: n.id,
        matchId: n.id,
        noteId: n.id,
        title: n.title,
        clientName: n.clientName,
        clientId: n.clientId,
        reason: n.reason,
        action: n.action,
        passage: n.passage,
        authority: n.authority,
        type: n.type,
        date: n.date,
        dateIso: '2026-11-10',
        officialUrl: n.officialUrl,
        review: n.review,
        subjectAreas: [],
        feedback: null,
      })),
      totalClassified: fixtureDofNotes.length,
    }
  }

  try {
    const firmId = persona.firmId
    const { data: clients } = await db
      .from('clients')
      .select('id, display_name')
      .eq('firm_id', firmId)
    const clientRows = (Array.isArray(clients) ? clients : []) as {
      id: string
      display_name: string
    }[]
    const clientMap = new Map(clientRows.map((c) => [c.id, c.display_name]))
    const clientIds = clientRows.map((c) => c.id)
    if (!clientIds.length) {
      return { source: 'fixture', items: [], totalClassified: 0 }
    }

    const { data: profiles } = await db
      .from('watch_profiles')
      .select('id, client_id')
      .in('client_id', clientIds)
    const profileRows = (Array.isArray(profiles) ? profiles : []) as {
      id: string
      client_id: string
    }[]
    const profileToClient = new Map(profileRows.map((p) => [p.id, p.client_id]))
    const profileIds = profileRows.map((p) => p.id)
    if (!profileIds.length) {
      return { source: 'fixture', items: [], totalClassified: 0 }
    }

    const { data: matches } = await db
      .from('matches')
      .select(
        'id, dof_note_id, watch_profile_id, reason, suggested_action, supporting_chunk_ids, feedback, score'
      )
      .in('watch_profile_id', profileIds)
      .order('created_at', { ascending: false })
      .limit(80)

    const matchRows = (Array.isArray(matches) ? matches : []) as {
      id: string
      dof_note_id: string
      watch_profile_id: string
      reason: string | null
      suggested_action: string | null
      supporting_chunk_ids: string[]
      feedback: 'relevante' | 'no_relevante' | null
      score: number
    }[]

    if (!matchRows.length) {
      // Empty DB matches → fixtures only when no classified corpus either
      const { data: anyClass } = await db
        .from('classifications')
        .select('id')
        .limit(1)
      if (!Array.isArray(anyClass) || !anyClass.length) {
        return {
          source: 'fixture',
          items: fixtureDofNotes.map((n) => ({
            id: n.id,
            matchId: n.id,
            noteId: n.id,
            title: n.title,
            clientName: n.clientName,
            clientId: n.clientId,
            reason: n.reason,
            action: n.action,
            passage: n.passage,
            authority: n.authority,
            type: n.type,
            date: n.date,
            dateIso: '2026-11-10',
            officialUrl: n.officialUrl,
            review: n.review,
            subjectAreas: [],
            feedback: null,
          })),
          totalClassified: fixtureDofNotes.length,
        }
      }
      return { source: 'schema', items: [], totalClassified: 0 }
    }

    const noteIds = [...new Set(matchRows.map((m) => m.dof_note_id))]
    const { data: notes } = await db
      .from('dof_notes')
      .select('id, note_code, title, authority, note_date')
      .in('id', noteIds)
    const noteMap = new Map(
      ((Array.isArray(notes) ? notes : []) as {
        id: string
        note_code: string
        title: string | null
        authority: string | null
        note_date: string
      }[]).map((n) => [n.id, n])
    )

    const { data: classRows } = await db
      .from('classifications')
      .select('dof_note_id, labels, document_type, summary, authority')
      .in('dof_note_id', noteIds)
      .is('chunk_id', null)
    const classMap = new Map(
      ((Array.isArray(classRows) ? classRows : []) as {
        dof_note_id: string
        labels: string[]
        document_type: string | null
        summary: string | null
        authority: string | null
      }[]).map((c) => [c.dof_note_id, c])
    )

    const chunkIds = [
      ...new Set(matchRows.flatMap((m) => m.supporting_chunk_ids ?? [])),
    ]
    const chunkMap = new Map<string, string>()
    if (chunkIds.length) {
      const { data: chunks } = await db
        .from('chunks')
        .select('id, text')
        .in('id', chunkIds)
      for (const c of (Array.isArray(chunks) ? chunks : []) as {
        id: string
        text: string
      }[]) {
        chunkMap.set(c.id, c.text)
      }
    }

    const { data: classifiedRows } = await db
      .from('dof_notes')
      .select('id')
      .eq('classify_status', 'classified')
      .limit(500)
    const classifiedCount = Array.isArray(classifiedRows) ? classifiedRows.length : 0

    let items: MonitorItem[] = matchRows.map((m) => {
      const note = noteMap.get(m.dof_note_id)
      const cls = classMap.get(m.dof_note_id)
      const clientId = profileToClient.get(m.watch_profile_id) ?? ''
      const passageId = (m.supporting_chunk_ids ?? [])[0]
      const passage =
        (passageId && chunkMap.get(passageId)?.slice(0, 600)) ||
        cls?.summary ||
        'Sin pasaje almacenado.'
      const iso = note?.note_date ?? '2026-11-10'
      const code = note?.note_code ?? ''
      return {
        id: m.id,
        matchId: m.id,
        noteId: m.dof_note_id,
        title: note?.title || 'Nota del DOF',
        clientName: clientMap.get(clientId) ?? 'Cliente',
        clientId,
        reason: m.reason ?? '',
        action: m.suggested_action ?? '',
        passage,
        authority: cls?.authority || note?.authority || '—',
        type: cls?.document_type || 'otro',
        date: formatEsDate(iso),
        dateIso: iso,
        officialUrl: code ? officialDofUrl(code, iso) : 'https://www.dof.gob.mx/',
        review: (m.feedback === 'relevante'
          ? 'aprobado'
          : m.feedback === 'no_relevante'
            ? 'rechazado'
            : 'en_revision') as ReviewState,
        subjectAreas: cls?.labels ?? [],
        feedback: m.feedback,
      }
    })

    if (filters?.clientId) {
      items = items.filter((i) => i.clientId === filters.clientId)
    }
    if (filters?.subjectArea) {
      items = items.filter((i) => i.subjectAreas.includes(filters.subjectArea!))
    }
    if (filters?.authority) {
      items = items.filter((i) =>
        i.authority.toLowerCase().includes(filters.authority!.toLowerCase())
      )
    }
    if (filters?.documentType) {
      items = items.filter((i) => i.type === filters.documentType)
    }
    if (filters?.onlyMine !== false) {
      // default: firm scope already applied via profiles
    }

    return {
      source: 'schema',
      items,
      totalClassified: classifiedCount,
    }
  } catch {
    return {
      source: 'fixture',
      items: fixtureDofNotes.map((n) => ({
        id: n.id,
        matchId: n.id,
        noteId: n.id,
        title: n.title,
        clientName: n.clientName,
        clientId: n.clientId,
        reason: n.reason,
        action: n.action,
        passage: n.passage,
        authority: n.authority,
        type: n.type,
        date: n.date,
        dateIso: '2026-11-10',
        officialUrl: n.officialUrl,
        review: n.review,
        subjectAreas: [],
        feedback: null,
      })),
      totalClassified: fixtureDofNotes.length,
    }
  }
}

export async function loadHoyBriefing(persona: DemoPersona) {
  const { items, source, totalClassified } = await loadMonitorMatches(persona)
  const today = new Date()
  const todayIso = new Date(today.getTime() - 6 * 3600_000).toISOString().slice(0, 10)
  const yesterday = new Date(today.getTime() - 30 * 3600_000).toISOString().slice(0, 10)

  const todayItems = items.filter((i) => i.dateIso === todayIso)
  const unopenedYesterday = items.filter(
    (i) => i.dateIso === yesterday && i.feedback === null
  )

  const byClient = new Map<string, MonitorItem[]>()
  for (const i of todayItems.length ? todayItems : items.slice(0, 12)) {
    const list = byClient.get(i.clientName) ?? []
    list.push(i)
    byClient.set(i.clientName, list)
  }

  const db = tryCreateCiceronAdminClient()
  let reviews: {
    id: string
    clientName: string
    title: string
    due: string
    assignee: string
    state: ReviewState
  }[] = fixtureReviews.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    title: r.title,
    due: r.due,
    assignee: r.assignee,
    state: r.state,
  }))
  if (db) {
    try {
      const { data } = await db
        .from('review_tasks')
        .select('id, status, matter_id, ai_output_id, created_at')
        .eq('status', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(10)
      if (Array.isArray(data) && data.length) {
        const matterIds = data.map((r) => (r as { matter_id: string }).matter_id)
        const { data: matters } = await db
          .from('matters')
          .select('id, title, client_id')
          .in('id', matterIds)
          .eq('firm_id', persona.firmId)
        const matterMap = new Map(
          ((Array.isArray(matters) ? matters : []) as {
            id: string
            title: string
            client_id: string
          }[]).map((m) => [m.id, m])
        )
        const { data: clients } = await db
          .from('clients')
          .select('id, display_name')
          .eq('firm_id', persona.firmId)
        const clientMap = new Map(
          ((Array.isArray(clients) ? clients : []) as {
            id: string
            display_name: string
          }[]).map((c) => [c.id, c.display_name])
        )
        reviews = data.map((r) => {
          const row = r as {
            id: string
            matter_id: string
            created_at: string
          }
          const matter = matterMap.get(row.matter_id)
          return {
            id: row.id,
            clientName: matter
              ? clientMap.get(matter.client_id) ?? 'Cliente'
              : 'Cliente',
            title: matter?.title ?? 'Revisión pendiente',
            due: formatEsDate(row.created_at.slice(0, 10)),
            assignee: persona.displayName,
            state: 'en_revision' as ReviewState,
          }
        })
      }
    } catch {
      // keep fixtures
    }
  }

  return {
    source,
    byClient,
    todayCount: todayItems.length,
    totalClassified,
    unopenedYesterday,
    reviews,
    emptyToday: todayItems.length === 0,
  }
}

export { CICERON_SEED }
