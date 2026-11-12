/**
 * «Continuar donde lo dejó» + saved views on Hoy.
 * engagement_resume.label stores a room/label *code* only — never client/matter names.
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { loadSavedViews, type SavedView } from '@/lib/ciceron/case-files/saved-views'
import { savedViewHref } from '@/lib/ciceron/case-files/saved-view-href'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

/** Stable codes stored in engagement_resume.label (not free text). */
export const RESUME_LABEL_CODES = [
  'monitor_dof_open_matches',
  'revision_queue',
  'expedientes_calendar',
  'investigacion_desk',
  'clientes_list',
  'hoy',
] as const

export type ResumeLabelCode = (typeof RESUME_LABEL_CODES)[number]

export type ResumeCursorStored = {
  room: string
  href: string
  /** Label *code*, not display text. */
  label: ResumeLabelCode | string
}

export type ResumeCursor = {
  room: string
  href: string
  labelCode: string
  label: string
}

export type HoyEngagement = {
  resume: ResumeCursor | null
  savedViews: Array<SavedView & { href: string }>
}

const RESUME_LABEL_ES: Record<string, string> = {
  monitor_dof_open_matches: 'Monitor DOF — coincidencias abiertas',
  revision_queue: 'Revisión — cola pendiente',
  expedientes_calendar: 'Expedientes — calendario',
  investigacion_desk: 'Investigación',
  clientes_list: 'Clientes y asuntos',
  hoy: copy.rooms.hoy,
}

export function resumeLabelEs(code: string): string {
  return RESUME_LABEL_ES[code] ?? copy.engagement.continueFallback
}

function hydrateResume(row: ResumeCursorStored): ResumeCursor {
  return {
    room: row.room,
    href: row.href,
    labelCode: row.label,
    label: resumeLabelEs(row.label),
  }
}

const FIXTURE_RESUME: ResumeCursor = hydrateResume({
  room: 'monitor-dof',
  href: '/ciceron/monitor-dof',
  label: 'monitor_dof_open_matches',
})

export async function loadHoyEngagement(
  persona: DemoPersona
): Promise<HoyEngagement> {
  const db = tryCreateCiceronAdminClient()
  let resume: ResumeCursor | null = FIXTURE_RESUME

  if (db) {
    try {
      const { data } = await db
        .from('engagement_resume')
        .select('room, href, label')
        .eq('firm_id', persona.firmId)
        .eq('user_id', persona.id)
        .limit(1)
      if (Array.isArray(data) && data[0]) {
        resume = hydrateResume(data[0] as ResumeCursorStored)
      }
    } catch {
      resume = FIXTURE_RESUME
    }
  }

  const { views } = await loadSavedViews(persona, 'monitor-dof')
  const savedViews = views.map((v) => ({ ...v, href: savedViewHref(v) }))

  return { resume, savedViews }
}

export async function setResumeCursor(
  persona: DemoPersona,
  cursor: { room: string; href: string; labelCode: ResumeLabelCode }
): Promise<void> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return
  await db.from('engagement_resume').upsert(
    {
      firm_id: persona.firmId,
      user_id: persona.id,
      room: cursor.room,
      href: cursor.href,
      label: cursor.labelCode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firm_id,user_id' }
  )
}
