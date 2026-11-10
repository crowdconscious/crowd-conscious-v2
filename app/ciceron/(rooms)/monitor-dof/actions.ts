'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { complete } from '@/lib/ciceron/gateway/complete'
import {
  PROMPT_CLIENT_ALERT_V1,
  wrapUntrusted,
} from '@/lib/ciceron/gateway/prompts'

export async function submitMatchFeedback(formData: FormData) {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false as const, error: 'auth' }

  const matchId = String(formData.get('matchId') ?? '')
  const verdict = String(formData.get('verdict') ?? '')
  const reason = String(formData.get('reason') ?? '').slice(0, 500)
  if (!matchId || (verdict !== 'relevante' && verdict !== 'no_relevante')) {
    return { ok: false as const, error: 'invalid' }
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false as const, error: 'db' }

  await db
    .from('matches')
    .update({
      feedback: verdict,
      feedback_reason: reason || null,
      feedback_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  await db.from('events').insert({
    name: verdict === 'relevante' ? 'match_feedback_relevant' : 'match_feedback_not_relevant',
    firm_id: persona.firmId,
    user_id: persona.id,
    properties: { match_id: matchId, reason },
  })

  revalidatePath('/ciceron/monitor-dof')
  revalidatePath('/ciceron/hoy')
  return { ok: true as const }
}

const alertSchema = z.object({
  subject: z.string(),
  body: z.string(),
  citation_chunk_ids: z.array(z.string()).default([]),
})

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1]!.trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no JSON')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function prepareClientAlert(formData: FormData) {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false as const, error: 'auth' }
  if (persona.role === 'pasante') return { ok: false as const, error: 'forbidden' }

  const matchId = String(formData.get('matchId') ?? '')
  if (!matchId) return { ok: false as const, error: 'invalid' }

  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false as const, error: 'db' }

  const { data: matches } = await db
    .from('matches')
    .select(
      'id, dof_note_id, watch_profile_id, reason, suggested_action, supporting_chunk_ids'
    )
    .eq('id', matchId)
    .limit(1)
  const match = Array.isArray(matches) && matches[0]
    ? (matches[0] as {
        id: string
        dof_note_id: string
        watch_profile_id: string
        reason: string | null
        suggested_action: string | null
        supporting_chunk_ids: string[]
      })
    : null
  if (!match) return { ok: false as const, error: 'not_found' }

  const { data: profiles } = await db
    .from('watch_profiles')
    .select('id, client_id, description')
    .eq('id', match.watch_profile_id)
    .limit(1)
  const profile = Array.isArray(profiles) && profiles[0]
    ? (profiles[0] as { id: string; client_id: string; description: string | null })
    : null
  if (!profile) return { ok: false as const, error: 'profile' }

  const { data: clients } = await db
    .from('clients')
    .select('id, display_name, firm_id')
    .eq('id', profile.client_id)
    .limit(1)
  const client = Array.isArray(clients) && clients[0]
    ? (clients[0] as { id: string; display_name: string; firm_id: string })
    : null
  if (!client || client.firm_id !== persona.firmId) {
    return { ok: false as const, error: 'tenant' }
  }

  const { data: notes } = await db
    .from('dof_notes')
    .select('id, title, authority')
    .eq('id', match.dof_note_id)
    .limit(1)
  const note = Array.isArray(notes) && notes[0]
    ? (notes[0] as { id: string; title: string | null; authority: string | null })
    : null

  const { data: classRows } = await db
    .from('classifications')
    .select('summary')
    .eq('dof_note_id', match.dof_note_id)
    .is('chunk_id', null)
    .limit(1)
  const summary =
    Array.isArray(classRows) && classRows[0]
      ? (classRows[0] as { summary: string | null }).summary
      : null

  const chunkIds = match.supporting_chunk_ids ?? []
  let chunkTexts: { id: string; text: string }[] = []
  if (chunkIds.length) {
    const { data: chunks } = await db
      .from('chunks')
      .select('id, text')
      .in('id', chunkIds)
    chunkTexts = (Array.isArray(chunks) ? chunks : []) as {
      id: string
      text: string
    }[]
  }

  const { data: matters } = await db
    .from('matters')
    .select('id, title')
    .eq('client_id', client.id)
    .eq('firm_id', persona.firmId)
    .eq('status', 'activo')
    .limit(1)
  const matter = Array.isArray(matters) && matters[0]
    ? (matters[0] as { id: string; title: string })
    : null
  if (!matter) return { ok: false as const, error: 'no_matter' }

  const { data: pv } = await db
    .from('prompt_versions')
    .select('id')
    .eq('purpose', PROMPT_CLIENT_ALERT_V1.purpose)
    .eq('version_label', PROMPT_CLIENT_ALERT_V1.versionLabel)
    .limit(1)
  const promptVersionId =
    Array.isArray(pv) && pv[0] ? (pv[0] as { id: string }).id : null

  const user = [
    `Cliente: ${client.display_name}`,
    `Contexto: ${profile.description ?? ''}`,
    `Motivo del match: ${match.reason ?? ''}`,
    `Acción sugerida interna: ${match.suggested_action ?? ''}`,
    `Nota: ${note?.title ?? ''}`,
    `Autoridad: ${note?.authority ?? ''}`,
    `Resumen: ${summary ?? ''}`,
    `Chunks citables: ${JSON.stringify(chunkTexts.map((c) => ({ id: c.id, text: c.text.slice(0, 500) })))}`,
    '',
    wrapUntrusted(
      'DOF_NOTE',
      chunkTexts.map((c) => c.text).join('\n\n').slice(0, 12_000)
    ),
  ].join('\n')

  const result = await complete({
    purpose: PROMPT_CLIENT_ALERT_V1.purpose,
    tier: 'creative',
    promptVersionId,
    system: PROMPT_CLIENT_ALERT_V1.system,
    user,
    maxTokens: 1600,
    firmId: persona.firmId,
    matterId: matter.id,
    userId: persona.id,
    retrievedChunkIds: chunkTexts.map((c) => c.id),
  })
  if (!result.ok || !result.aiRunId) {
    return { ok: false as const, error: result.ok ? 'no_run' : result.message }
  }

  let draft: z.infer<typeof alertSchema>
  try {
    draft = alertSchema.parse(parseJsonObject(result.text))
  } catch {
    return { ok: false as const, error: 'parse' }
  }

  const validCitations = draft.citation_chunk_ids.filter((id) =>
    chunkTexts.some((c) => c.id === id)
  )

  const { data: outputs } = await db
    .from('ai_outputs')
    .insert({
      ai_run_id: result.aiRunId,
      tier: 2,
      status: 'borrador',
      body: `${draft.subject}\n\n${draft.body}`,
      structured: {
        subject: draft.subject,
        match_id: matchId,
        client_id: client.id,
        label: 'Datos de demostración',
      },
    })
    .select('id')
    .limit(1)
  const outputId =
    Array.isArray(outputs) && outputs[0]
      ? (outputs[0] as { id: string }).id
      : null
  if (!outputId) return { ok: false as const, error: 'output' }

  for (const chunkId of validCitations) {
    await db.from('output_citations').insert({
      ai_output_id: outputId,
      chunk_id: chunkId,
      citation_label: 'DOF',
    })
  }

  await db.from('review_tasks').insert({
    matter_id: matter.id,
    ai_output_id: outputId,
    assignee_id: persona.id,
    status: 'pendiente',
  })

  await db.from('events').insert({
    name: 'prepare_client_alert',
    firm_id: persona.firmId,
    user_id: persona.id,
    properties: {
      match_id: matchId,
      ai_output_id: outputId,
      label: 'Datos de demostración',
    },
  })

  revalidatePath('/ciceron/revision')
  revalidatePath('/ciceron/hoy')
  revalidatePath('/ciceron/monitor-dof')
  return { ok: true as const, outputId }
}
