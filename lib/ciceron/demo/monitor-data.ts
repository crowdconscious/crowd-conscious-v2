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
import { resolveDisplayTitle } from '@/lib/ciceron/dof/display-title'

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
  /** True only when a review_tasks row exists for this match/output. */
  hasReviewTask: boolean
  /** Procurement / contratación lane — shown separately when profile opts in. */
  isProcurement: boolean
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
        hasReviewTask: n.review === 'en_revision',
        isProcurement: false,
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
            hasReviewTask: n.review === 'en_revision',
            isProcurement: false,
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
      .select('dof_note_id, labels, document_type, summary, authority, payload')
      .in('dof_note_id', noteIds)
      .is('chunk_id', null)
    const classMap = new Map(
      ((Array.isArray(classRows) ? classRows : []) as {
        dof_note_id: string
        labels: string[]
        document_type: string | null
        summary: string | null
        authority: string | null
        payload?: { display_title?: string } | null
      }[]).map((c) => [c.dof_note_id, c])
    )

    // Review badge only when a review_tasks row exists for the same client matter
    // with output_type client_alert — never for bare Tier 0 alerts.
    const reviewMatchIds = new Set<string>()
    {
      const { data: tasks } = await db
        .from('review_tasks')
        .select('id, matter_id, status, output_type')
        .in('status', ['pendiente', 'en_curso'])
        .eq('output_type', 'client_alert')
        .limit(200)
      const taskMatterIds = new Set(
        ((Array.isArray(tasks) ? tasks : []) as { matter_id: string }[]).map(
          (t) => t.matter_id
        )
      )
      if (taskMatterIds.size) {
        const { data: matters } = await db
          .from('matters')
          .select('id, client_id')
          .in('id', [...taskMatterIds])
          .eq('firm_id', firmId)
        const clientsWithReview = new Set(
          ((Array.isArray(matters) ? matters : []) as { client_id: string }[]).map(
            (m) => m.client_id
          )
        )
        for (const m of matchRows) {
          const clientId = profileToClient.get(m.watch_profile_id)
          // Only badge when the match already entered the review path (feedback or
          // explicit client_alert task for that client). Tier 0 alone → no badge.
          if (clientId && clientsWithReview.has(clientId) && m.feedback === 'relevante') {
            reviewMatchIds.add(m.id)
          }
        }
      }
    }

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

    const PROCUREMENT_TYPES = new Set([
      'licitacion',
      'convocatoria',
      'fallo',
      'contratacion_publica',
    ])

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
      const docType = cls?.document_type || 'otro'
      const payloadTitle =
        cls?.payload && typeof cls.payload === 'object'
          ? (cls.payload as { display_title?: string }).display_title
          : null
      const title = resolveDisplayTitle({
        noteTitle: note?.title,
        displayTitle: payloadTitle,
        summary: cls?.summary,
        authority: cls?.authority || note?.authority,
        documentType: docType,
        noteCode: code,
      })
      const hasReviewTask = reviewMatchIds.has(m.id)
      return {
        id: m.id,
        matchId: m.id,
        noteId: m.dof_note_id,
        title,
        clientName: clientMap.get(clientId) ?? 'Cliente',
        clientId,
        reason: m.reason ?? '',
        action: m.suggested_action ?? '',
        passage,
        authority: cls?.authority || note?.authority || '—',
        type: docType,
        date: formatEsDate(iso),
        dateIso: iso,
        officialUrl: code ? officialDofUrl(code, iso) : 'https://www.dof.gob.mx/',
        review: (hasReviewTask
          ? 'en_revision'
          : m.feedback === 'relevante'
            ? 'aprobado'
            : m.feedback === 'no_relevante'
              ? 'rechazado'
              : 'borrador') as ReviewState,
        subjectAreas: cls?.labels ?? [],
        feedback: m.feedback,
        hasReviewTask,
        isProcurement: PROCUREMENT_TYPES.has(docType),
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
        hasReviewTask: n.review === 'en_revision',
        isProcurement: false,
      })),
      totalClassified: fixtureDofNotes.length,
    }
  }
}

function mexicoCityTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function loadHoyBriefing(persona: DemoPersona) {
  const { items, source, totalClassified } = await loadMonitorMatches(persona)
  const todayIso = mexicoCityTodayIso()

  // Latest processed (classified) edition in the corpus — not "today" unless it is.
  let editionIso: string | null = null
  const db = tryCreateCiceronAdminClient()
  if (db) {
    try {
      const { data: latest } = await db
        .from('dof_notes')
        .select('note_date')
        .eq('classify_status', 'classified')
        .order('note_date', { ascending: false })
        .limit(1)
      if (Array.isArray(latest) && latest[0]) {
        editionIso = (latest[0] as { note_date: string }).note_date
      }
    } catch {
      // keep null
    }
  }
  if (!editionIso) {
    editionIso = items.map((i) => i.dateIso).sort().at(-1) ?? todayIso
  }

  const editionItems = items.filter((i) => i.dateIso === editionIso)
  const displayItems = editionItems
  const unopenedYesterday = items
    .filter((i) => i.dateIso < editionIso! && i.feedback === null)
    .slice(0, 8)

  const byClient = new Map<string, MonitorItem[]>()
  for (const i of displayItems) {
    if (i.isProcurement) continue
    const list = byClient.get(i.clientName) ?? []
    list.push(i)
    byClient.set(i.clientName, list)
  }

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

  const matchCount = [...byClient.values()].reduce((n, list) => n + list.length, 0)
  const editionIsToday = editionIso === todayIso

  return {
    source,
    byClient,
    todayCount: matchCount,
    totalClassified,
    unopenedYesterday,
    reviews,
    /** True only when the latest processed edition has zero client matches. */
    emptyToday: matchCount === 0,
    editionIso,
    editionIsToday,
    editionLabel: formatEsDate(editionIso),
  }
}

export { CICERON_SEED }
