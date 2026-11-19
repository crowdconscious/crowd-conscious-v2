import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import type {
  FirmMemberOption,
  MatchAssignment,
  MatchAssignmentStatus,
  MatchComment,
  MatterOption,
} from './types'

type Db = NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>

async function matterIdsForPersona(
  db: Db,
  persona: DemoPersona
): Promise<string[] | 'all'> {
  if (persona.role === 'socio' || persona.role === 'asociado' || persona.role === 'admin') {
    return 'all'
  }
  const { data } = await db
    .from('matter_members')
    .select('matter_id')
    .eq('user_id', persona.id)
  const rows = (Array.isArray(data) ? data : []) as { matter_id: string }[]
  return rows.map((r) => r.matter_id)
}

function mapAssignment(row: Record<string, unknown>): MatchAssignment {
  return {
    id: String(row.id),
    firmId: String(row.firm_id),
    matchId: String(row.match_id),
    matterId: String(row.matter_id),
    assigneeActor: String(row.assignee_actor),
    assignedByActor: String(row.assigned_by_actor),
    dueAt: row.due_at ? String(row.due_at) : null,
    status: row.status as MatchAssignmentStatus,
    isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapComment(row: Record<string, unknown>): MatchComment {
  const mentions = Array.isArray(row.mentions)
    ? (row.mentions as unknown[]).map(String)
    : []
  return {
    id: String(row.id),
    firmId: String(row.firm_id),
    matchId: String(row.match_id),
    matterId: String(row.matter_id),
    authorActor: String(row.author_actor),
    body: String(row.body),
    mentions,
    createdAt: String(row.created_at),
    editedAt: row.edited_at ? String(row.edited_at) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    isDemo: Boolean(row.is_demo),
  }
}

export async function loadFirmMembers(
  persona: DemoPersona
): Promise<FirmMemberOption[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return [
      { id: persona.id, displayName: persona.displayName, role: persona.role },
    ]
  }
  const { data: memberships } = await db
    .from('memberships')
    .select('user_id, role')
    .eq('firm_id', persona.firmId)
  const rows = (Array.isArray(memberships) ? memberships : []) as {
    user_id: string
    role: string
  }[]
  const ids = rows.map((r) => r.user_id)
  if (ids.length === 0) return []

  const { data: personas } = await db
    .from('demo_personas')
    .select('id, display_name, role')
    .in('id', ids)
  const nameMap = new Map(
    ((Array.isArray(personas) ? personas : []) as {
      id: string
      display_name: string
      role: string
    }[]).map((p) => [p.id, p])
  )

  return rows.map((r) => {
    const p = nameMap.get(r.user_id)
    return {
      id: r.user_id,
      displayName: p?.display_name ?? r.user_id.slice(0, 8),
      role: r.role,
    }
  })
}

export async function loadMattersForMatchClient(
  persona: DemoPersona,
  matchId: string
): Promise<MatterOption[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []

  const { data: matchRows } = await db
    .from('matches')
    .select('id, watch_profile_id')
    .eq('id', matchId)
    .limit(1)
  const match = (Array.isArray(matchRows) ? matchRows[0] : null) as {
    watch_profile_id: string
  } | null
  if (!match) return []

  const { data: profiles } = await db
    .from('watch_profiles')
    .select('id, client_id')
    .eq('id', match.watch_profile_id)
    .limit(1)
  const profile = (Array.isArray(profiles) ? profiles[0] : null) as {
    client_id: string
  } | null
  if (!profile) return []

  const { data: matters } = await db
    .from('matters')
    .select('id, title, client_id')
    .eq('client_id', profile.client_id)
  let rows = (Array.isArray(matters) ? matters : []) as {
    id: string
    title: string
    client_id: string
  }[]

  const scope = await matterIdsForPersona(db, persona)
  if (scope !== 'all') {
    const allowed = new Set(scope)
    rows = rows.filter((m) => allowed.has(m.id))
  }

  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    clientId: m.client_id,
  }))
}

export async function loadAssignmentsForMatch(
  persona: DemoPersona,
  matchId: string
): Promise<MatchAssignment[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []

  const scope = await matterIdsForPersona(db, persona)
  const { data } = await db
    .from('match_assignments')
    .select('*')
    .eq('firm_id', persona.firmId)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })

  let rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  if (scope !== 'all') {
    const allowed = new Set(scope)
    rows = rows.filter((r) => allowed.has(String(r.matter_id)))
  }
  return rows.map(mapAssignment)
}

export async function loadMyAssignments(
  persona: DemoPersona
): Promise<MatchAssignment[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []

  const scope = await matterIdsForPersona(db, persona)
  const { data } = await db
    .from('match_assignments')
    .select('*')
    .eq('firm_id', persona.firmId)
    .eq('assignee_actor', persona.id)
    .order('due_at', { ascending: true })

  let rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  if (scope !== 'all') {
    const allowed = new Set(scope)
    rows = rows.filter((r) => allowed.has(String(r.matter_id)))
  }

  const assignments = rows.map(mapAssignment)
  if (assignments.length === 0) return assignments

  const matchIds = [...new Set(assignments.map((a) => a.matchId))]
  const matterIds = [...new Set(assignments.map((a) => a.matterId))]
  const members = await loadFirmMembers(persona)
  const nameById = new Map(members.map((m) => [m.id, m.displayName]))

  const { data: matches } = await db
    .from('matches')
    .select('id, reason, watch_profile_id')
    .in('id', matchIds)
  const matchRows = (Array.isArray(matches) ? matches : []) as {
    id: string
    reason: string | null
    watch_profile_id: string
  }[]
  const profileIds = matchRows.map((m) => m.watch_profile_id)
  const { data: profiles } = await db
    .from('watch_profiles')
    .select('id, client_id')
    .in('id', profileIds)
  const profileRows = (Array.isArray(profiles) ? profiles : []) as {
    id: string
    client_id: string
  }[]
  const clientIds = profileRows.map((p) => p.client_id)
  const { data: clients } = await db
    .from('clients')
    .select('id, display_name')
    .in('id', clientIds)
  const clientMap = new Map(
    ((Array.isArray(clients) ? clients : []) as {
      id: string
      display_name: string
    }[]).map((c) => [c.id, c.display_name])
  )
  const profileToClient = new Map(profileRows.map((p) => [p.id, p.client_id]))
  const matchMeta = new Map(
    matchRows.map((m) => [
      m.id,
      {
        reason: m.reason,
        clientName: clientMap.get(profileToClient.get(m.watch_profile_id) ?? '') ?? 'Cliente',
      },
    ])
  )

  const { data: matters } = await db
    .from('matters')
    .select('id, title')
    .in('id', matterIds)
  const matterMap = new Map(
    ((Array.isArray(matters) ? matters : []) as { id: string; title: string }[]).map(
      (m) => [m.id, m.title]
    )
  )

  return assignments.map((a) => {
    const meta = matchMeta.get(a.matchId)
    return {
      ...a,
      matchTitle: meta?.reason?.slice(0, 120) ?? a.matchId.slice(0, 8),
      clientName: meta?.clientName,
      matterTitle: matterMap.get(a.matterId),
      assigneeName: nameById.get(a.assigneeActor),
    }
  })
}

export async function loadMatchComments(
  persona: DemoPersona,
  matchId: string
): Promise<MatchComment[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []

  const scope = await matterIdsForPersona(db, persona)
  const { data } = await db
    .from('match_comments')
    .select('*')
    .eq('firm_id', persona.firmId)
    .eq('match_id', matchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  let rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  if (scope !== 'all') {
    const allowed = new Set(scope)
    rows = rows.filter((r) => allowed.has(String(r.matter_id)))
  }

  const comments = rows.map(mapComment)
  const members = await loadFirmMembers(persona)
  const nameById = new Map(members.map((m) => [m.id, m.displayName]))
  return comments.map((c) => ({
    ...c,
    authorName: nameById.get(c.authorActor) ?? c.authorActor.slice(0, 8),
  }))
}

/** Fixture-friendly empty collab when schema tables are absent. */
export function emptyCollabFixture(): {
  assignments: MatchAssignment[]
  comments: MatchComment[]
  members: FirmMemberOption[]
  matters: MatterOption[]
} {
  return { assignments: [], comments: [], members: [], matters: [] }
}
