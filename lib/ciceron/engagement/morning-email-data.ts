import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { loadMyAssignments } from '@/lib/ciceron/collaboration/data'
import { countDeadlinesInCurrentWeek } from '@/lib/ciceron/deadlines/week-window-pure'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'
import {
  buildMorningEmailPayload,
  renderMorningEmailHtml,
  type MorningEmailItem,
  type MorningEmailPayload,
} from './morning-email-pure'
import { createCiceronMorningUnsubToken } from './morning-email-unsub'

export type MorningEmailPrefs = {
  id: string
  firmId: string
  actorId: string
  email: string
  morningEnabled: boolean
  includeNovedades: boolean
  includePlazos: boolean
  includeAssignments: boolean
  unsubscribedAt: string | null
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  )
}

export async function loadMorningEmailPrefs(
  persona: DemoPersona
): Promise<MorningEmailPrefs | null> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  const { data } = await db
    .from('morning_email_preferences')
    .select('*')
    .eq('firm_id', persona.firmId)
    .eq('actor_id', persona.id)
    .limit(1)
  const row = (Array.isArray(data) ? data[0] : null) as Record<
    string,
    unknown
  > | null
  if (!row) return null
  return {
    id: String(row.id),
    firmId: String(row.firm_id),
    actorId: String(row.actor_id),
    email: String(row.email),
    morningEnabled: Boolean(row.morning_enabled),
    includeNovedades: row.include_novedades !== false,
    includePlazos: row.include_plazos !== false,
    includeAssignments: row.include_assignments !== false,
    unsubscribedAt: row.unsubscribed_at ? String(row.unsubscribed_at) : null,
  }
}

export async function upsertMorningEmailPrefs(input: {
  persona: DemoPersona
  email: string
  morningEnabled: boolean
  includeNovedades: boolean
  includePlazos: boolean
  includeAssignments: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, error: 'db' }
  const email = input.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'invalid_email' }
  }

  const isDemo = input.persona.firmId === CICERON_SEED.firmDemo
  const { error } = await db.from('morning_email_preferences').upsert(
    {
      firm_id: input.persona.firmId,
      actor_id: input.persona.id,
      email,
      morning_enabled: input.morningEnabled,
      include_novedades: input.includeNovedades,
      include_plazos: input.includePlazos,
      include_assignments: input.includeAssignments,
      unsubscribed_at: null,
      is_demo: isDemo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firm_id,actor_id' }
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function markMorningUnsubscribed(
  firmId: string,
  actorId: string
): Promise<void> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return
  await db
    .from('morning_email_preferences')
    .update({
      morning_enabled: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('firm_id', firmId)
    .eq('actor_id', actorId)
}

/** Demo firm: only the actor's own opted-in email — never fictional clients. */
export function isSafeDemoRecipient(opts: {
  firmId: string
  recipientEmail: string
  prefsEmail: string
}): boolean {
  if (opts.firmId !== CICERON_SEED.firmDemo) return true
  return (
    opts.recipientEmail.trim().toLowerCase() ===
    opts.prefsEmail.trim().toLowerCase()
  )
}

export async function buildMorningEmailForPersona(
  persona: DemoPersona,
  prefs: Pick<
    MorningEmailPrefs,
    'includeNovedades' | 'includePlazos' | 'includeAssignments'
  >
): Promise<{ payload: MorningEmailPayload; html: string }> {
  const baseUrl = appBaseUrl()
  const [briefing, { deadlines }, assignments] = await Promise.all([
    loadHoyBriefing(persona),
    loadDeadlines(persona),
    loadMyAssignments(persona),
  ])

  const novedades: MorningEmailItem[] = []
  if (prefs.includeNovedades) {
    for (const [clientName, items] of briefing.byClient.entries()) {
      for (const item of items.slice(0, 4)) {
        novedades.push({
          id: item.id,
          kind: 'novedad',
          title: `${clientName}: ${item.title}`,
          detail: item.reason?.slice(0, 160),
          href: `${baseUrl}/ciceron/monitor-dof/${item.matchId}`,
          ctaLabel: 'Ver coincidencia',
        })
      }
    }
  }

  const plazos: MorningEmailItem[] = []
  if (prefs.includePlazos) {
    const dueAts = deadlines
      .map((d) => d.dueAt)
      .filter((v): v is string => Boolean(v))
    // Prefer items that fall in the current week window.
    const weekCount = countDeadlinesInCurrentWeek(dueAts)
    void weekCount
    for (const d of deadlines.slice(0, 8)) {
      if (!d.dueAt) continue
      plazos.push({
        id: d.id,
        kind: 'plazo',
        title: `${d.clientName}: ${d.label}`,
        detail: d.dueAt ? formatDateLongEs(d.dueAt) : d.due,
        href: `${baseUrl}/ciceron/expedientes`,
        ctaLabel: 'Ver plazo',
      })
    }
  }

  const assignmentItems: MorningEmailItem[] = []
  if (prefs.includeAssignments) {
    for (const a of assignments.filter((x) => x.status !== 'hecho').slice(0, 8)) {
      assignmentItems.push({
        id: a.id,
        kind: 'asignacion',
        title: a.matchTitle ?? 'Asignación',
        detail: [a.clientName, a.status].filter(Boolean).join(' · '),
        href: `${baseUrl}/ciceron/monitor-dof/${a.matchId}`,
        ctaLabel: 'Abrir asignación',
      })
    }
  }

  const dateLabel = formatDateLongEs(new Date().toISOString())
  const token = createCiceronMorningUnsubToken(persona.firmId, persona.id)
  const payload = buildMorningEmailPayload({
    displayName: persona.displayName,
    dateLabel,
    baseUrl,
    unsubscribePath: `/api/ciceron/morning-email/unsubscribe?firm=${encodeURIComponent(persona.firmId)}&actor=${encodeURIComponent(persona.id)}&t=${encodeURIComponent(token)}`,
    novedades,
    plazos,
    assignments: assignmentItems,
  })
  return { payload, html: renderMorningEmailHtml(payload) }
}

export async function listOptedInMorningPrefs(): Promise<MorningEmailPrefs[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []
  const { data } = await db
    .from('morning_email_preferences')
    .select('*')
    .eq('morning_enabled', true)
    .is('unsubscribed_at', null)
  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  return rows.map((row) => ({
    id: String(row.id),
    firmId: String(row.firm_id),
    actorId: String(row.actor_id),
    email: String(row.email),
    morningEnabled: true,
    includeNovedades: row.include_novedades !== false,
    includePlazos: row.include_plazos !== false,
    includeAssignments: row.include_assignments !== false,
    unsubscribedAt: null,
  }))
}
