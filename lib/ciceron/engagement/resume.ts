/**
 * «Continuar donde lo dejó» + saved views on Hoy.
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { loadSavedViews, type SavedView } from '@/lib/ciceron/case-files/saved-views'
import { savedViewHref } from '@/lib/ciceron/case-files/saved-view-href'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

export type ResumeCursor = {
  room: string
  href: string
  label: string
}

export type HoyEngagement = {
  resume: ResumeCursor | null
  savedViews: Array<SavedView & { href: string }>
}

const FIXTURE_RESUME: ResumeCursor = {
  room: 'monitor-dof',
  href: '/ciceron/monitor-dof',
  label: 'Monitor DOF — coincidencias abiertas',
}

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
        const row = data[0] as ResumeCursor
        resume = row
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
  cursor: ResumeCursor
): Promise<void> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return
  await db.from('engagement_resume').upsert(
    {
      firm_id: persona.firmId,
      user_id: persona.id,
      room: cursor.room,
      href: cursor.href,
      label: cursor.label,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firm_id,user_id' }
  )
}
