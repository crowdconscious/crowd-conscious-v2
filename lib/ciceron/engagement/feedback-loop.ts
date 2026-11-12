/**
 * When a user marks alerts not relevant 3× for the same reason_code,
 * suggest a specific watch-profile edit and allow one-step apply.
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import {
  reasonSuggestionText,
  suggestionForReason,
} from '@/lib/ciceron/engagement/feedback-loop-pure'

export { suggestionForReason } from '@/lib/ciceron/engagement/feedback-loop-pure'

export type FeedbackSuggestion = {
  reasonCode: string
  count: number
  watchProfileId: string | null
  clientId: string | null
  suggestionEs: string
  applyHref: string
  applyLabel: string
}

export async function loadFeedbackSuggestion(
  persona: DemoPersona
): Promise<FeedbackSuggestion | null> {
  const db = tryCreateCiceronAdminClient()

  // Fixture path: three wrong_authority feedbacks in seed → show suggestion
  const fixture: FeedbackSuggestion = {
    reasonCode: 'wrong_authority',
    count: 3,
    watchProfileId: 'e1000000-0000-4000-8000-000000000001',
    clientId: 'c1000000-0000-4000-8000-000000000001',
    suggestionEs: reasonSuggestionText('wrong_authority')!,
    applyHref: '/ciceron/clientes?editWatch=e1000000-0000-4000-8000-000000000001&reason=wrong_authority',
    applyLabel: 'Aplicar ajuste al perfil',
  }

  if (!db) return fixture

  try {
    const { data, error } = await db
      .from('events')
      .select('properties, user_id')
      .eq('firm_id', persona.firmId)
      .eq('user_id', persona.id)
      .eq('name', 'alert_feedback')
      .order('occurred_at', { ascending: false })
      .limit(50)

    if (error || !Array.isArray(data)) return fixture

    const counts = new Map<string, { n: number; watch?: string; client?: string }>()
    for (const row of data) {
      const props = (row as { properties?: Record<string, unknown> }).properties ?? {}
      if (props.verdict !== 'not_relevant') continue
      const code = typeof props.reason_code === 'string' ? props.reason_code : ''
      if (!code) continue
      const prev = counts.get(code) ?? { n: 0 }
      prev.n += 1
      if (typeof props.watch_profile_id === 'string') prev.watch = props.watch_profile_id
      counts.set(code, prev)
    }

    for (const [code, { n, watch }] of counts) {
      const text = suggestionForReason(code, n)
      if (!text) continue
      return {
        reasonCode: code,
        count: n,
        watchProfileId: watch ?? fixture.watchProfileId,
        clientId: fixture.clientId,
        suggestionEs: text,
        applyHref: `/ciceron/clientes?editWatch=${watch ?? fixture.watchProfileId}&reason=${encodeURIComponent(code)}`,
        applyLabel: 'Aplicar ajuste al perfil',
      }
    }

    // Seeded demo firm still shows the fixture suggestion for the walkthrough
    if (persona.firmId === 'a1000000-0000-4000-8000-000000000001') return fixture
    return null
  } catch {
    return fixture
  }
}

/** One-step apply: record watch_profile_edited with the reason_code. */
export async function applyWatchProfileSuggestion(
  persona: DemoPersona,
  watchProfileId: string,
  reasonCode: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    await recordCiceronEvent({
      name: 'watch_profile_edited',
      firmId: persona.firmId,
      userId: persona.id,
      properties: {
        watch_profile_id: watchProfileId,
        reason_code: reasonCode,
        is_demo: true,
      },
    })
    return { ok: true }
  }

  // Soft edit: append a note to description without inventing authorities removal
  // when the profile row is missing in this environment.
  const { data } = await db
    .from('watch_profiles')
    .select('id, description, authorities')
    .eq('id', watchProfileId)
    .limit(1)

  if (Array.isArray(data) && data[0] && reasonCode === 'wrong_authority') {
    const row = data[0] as {
      id: string
      description: string | null
      authorities: string[] | null
    }
    const authorities = [...(row.authorities ?? [])]
    // Demo: drop last authority if more than one remain
    if (authorities.length > 1) authorities.pop()
    await db
      .from('watch_profiles')
      .update({
        authorities,
        description: `${row.description ?? ''}\n\n[Ajuste por retroalimentación: ${reasonCode}]`.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', watchProfileId)
  }

  await recordCiceronEvent({
    name: 'watch_profile_edited',
    firmId: persona.firmId,
    userId: persona.id,
    properties: {
      watch_profile_id: watchProfileId,
      reason_code: reasonCode,
      is_demo: true,
    },
  })

  return { ok: true }
}
