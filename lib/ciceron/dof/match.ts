import { z } from 'zod'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { complete } from '@/lib/ciceron/gateway/complete'
import {
  PROMPT_MATCH_V2,
  wrapUntrusted,
} from '@/lib/ciceron/gateway/prompts'
import {
  scoreCandidates,
  type NoteScoreInput,
  type WatchProfileScoreInput,
} from '@/lib/ciceron/dof/match-score'
import { isProcurementDocumentType } from '@/lib/ciceron/taxonomy'

export { scoreCandidates } from '@/lib/ciceron/dof/match-score'

const relevanceSchema = z.object({
  relevant: z.boolean(),
  reason: z.string(),
  suggested_action: z.string(),
  supporting_chunk_ids: z.array(z.string()).default([]),
})

type WatchProfile = WatchProfileScoreInput
type NoteContext = NoteScoreInput

async function resolvePromptVersionId(purpose: string, versionLabel: string) {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  const { data } = await db
    .from('prompt_versions')
    .select('id')
    .eq('purpose', purpose)
    .eq('version_label', versionLabel)
    .limit(1)
  return Array.isArray(data) && data[0] ? (data[0] as { id: string }).id : null
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1]!.trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no JSON object')
  return JSON.parse(raw.slice(start, end + 1))
}

async function loadNoteContext(noteId: string): Promise<NoteContext | null> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  const { data: notes } = await db
    .from('dof_notes')
    .select('id, title, authority, document_id')
    .eq('id', noteId)
    .limit(1)
  const note = Array.isArray(notes) && notes[0]
    ? (notes[0] as {
        id: string
        title: string | null
        authority: string | null
        document_id: string | null
      })
    : null
  if (!note) return null

  const { data: classRows } = await db
    .from('classifications')
    .select('labels, summary, document_type, authority')
    .eq('dof_note_id', noteId)
    .is('chunk_id', null)
    .limit(1)
  const cls = Array.isArray(classRows) && classRows[0]
    ? (classRows[0] as {
        labels: string[]
        summary: string | null
        document_type: string | null
        authority: string | null
      })
    : null

  let chunks: NoteContext['chunks'] = []
  if (note.document_id) {
    const { data: versions } = await db
      .from('document_versions')
      .select('id')
      .eq('document_id', note.document_id)
      .order('created_at', { ascending: false })
      .limit(1)
    const versionId =
      Array.isArray(versions) && versions[0]
        ? (versions[0] as { id: string }).id
        : null
    if (versionId) {
      const { data: chunkRows } = await db
        .from('chunks')
        .select('id, text, embedding')
        .eq('version_id', versionId)
        .order('position', { ascending: true })
        .limit(24)
      chunks = (Array.isArray(chunkRows) ? chunkRows : []) as NoteContext['chunks']
    }
  }

  return {
    id: note.id,
    title: note.title || '',
    authority: cls?.authority ?? note.authority,
    labels: cls?.labels ?? [],
    summary: cls?.summary ?? null,
    document_type: cls?.document_type ?? null,
    chunks,
  }
}

async function loadDemoFirmProfiles(): Promise<WatchProfile[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []
  const { data: clients } = await db
    .from('clients')
    .select('id')
    .eq('firm_id', CICERON_SEED.firmDemo)
    .eq('is_demo', true)
  const clientIds = (Array.isArray(clients) ? clients : []).map(
    (c) => (c as { id: string }).id
  )
  if (!clientIds.length) return []
  const { data: profiles } = await db
    .from('watch_profiles')
    .select(
      'id, client_id, subject_areas, authorities, keywords, norms_of_interest, description, embedding, include_procurement'
    )
    .in('client_id', clientIds)
    .eq('is_demo', true)
  return (Array.isArray(profiles) ? profiles : []).map((p) => {
    const row = p as WatchProfile & { include_procurement?: boolean | null }
    return {
      ...row,
      include_procurement: Boolean(row.include_procurement),
    }
  })
}

async function createTier0Alerts(opts: {
  matchId: string
  clientId: string
  headline: string
}) {
  const db = tryCreateCiceronAdminClient()
  if (!db) return
  const { data: matters } = await db
    .from('matters')
    .select('id')
    .eq('client_id', opts.clientId)
    .eq('firm_id', CICERON_SEED.firmDemo)
    .eq('status', 'activo')
  const matterRows = (Array.isArray(matters) ? matters : []) as { id: string }[]
  for (const m of matterRows.slice(0, 3)) {
    await db.from('alerts').insert({
      firm_id: CICERON_SEED.firmDemo,
      match_id: opts.matchId,
      matter_id: m.id,
      client_id: opts.clientId,
      severity: 'attention',
      status: 'nuevo',
      headline: opts.headline.slice(0, 500),
    })
  }
}

export async function matchDofNote(noteId: string): Promise<{
  ok: boolean
  matches: number
  costUsd: number
  error?: string
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, matches: 0, costUsd: 0, error: 'no db' }

  const note = await loadNoteContext(noteId)
  if (!note) {
    await db.from('dof_notes').update({ match_status: 'skipped' }).eq('id', noteId)
    return { ok: false, matches: 0, costUsd: 0, error: 'note missing' }
  }

  const profiles = await loadDemoFirmProfiles()
  // Procurement notices are excluded from regulatory matching unless the
  // profile explicitly opts in (include_procurement).
  const eligibleProfiles = isProcurementDocumentType(note.document_type)
    ? profiles.filter((p) => p.include_procurement)
    : profiles
  const candidates = scoreCandidates(note, eligibleProfiles).slice(0, 4)
  if (!candidates.length) {
    await db.from('dof_notes').update({ match_status: 'no_match' }).eq('id', noteId)
    return { ok: true, matches: 0, costUsd: 0 }
  }

  const promptVersionId = await resolvePromptVersionId(
    PROMPT_MATCH_V2.purpose,
    PROMPT_MATCH_V2.versionLabel
  )

  let matchCount = 0
  let costUsd = 0
  const chunkIdSet = new Set(note.chunks.map((c) => c.id))

  for (const cand of candidates) {
    const chunkPreview = note.chunks.slice(0, 8).map((c) => ({
      id: c.id,
      text: c.text.slice(0, 900),
    }))
    const user = [
      `Cliente / perfil: ${cand.profile.description ?? cand.profile.id}`,
      `Materias vigiladas: ${cand.profile.subject_areas.join(', ')}`,
      `Autoridades: ${cand.profile.authorities.join(', ')}`,
      `Palabras clave: ${cand.profile.keywords.join(', ')}`,
      `Puntaje candidato (sin modelo): ${cand.score.toFixed(3)} — ${cand.why}`,
      '',
      `Nota: ${note.title}`,
      `Tipo: ${note.document_type ?? '—'}`,
      `Autoridad: ${note.authority ?? '—'}`,
      `Resumen: ${note.summary ?? '—'}`,
      '',
      'Chunks disponibles (ids válidos):',
      JSON.stringify(chunkPreview),
      '',
      'Texto de la nota (datos no confiables):',
      wrapUntrusted(
        'DOF_NOTE',
        note.chunks
          .map((c) => c.text)
          .join('\n\n')
          .slice(0, 20_000)
      ),
    ].join('\n')

    const result = await complete({
      purpose: PROMPT_MATCH_V2.purpose,
      tier: 'fast',
      promptVersionId,
      system: PROMPT_MATCH_V2.system,
      user,
      maxTokens: 700,
      firmId: CICERON_SEED.firmDemo,
      retrievedChunkIds: note.chunks.slice(0, 8).map((c) => c.id),
    })
    if (!result.ok) continue
    costUsd += result.costEstimateUsd

    let judged: z.infer<typeof relevanceSchema>
    try {
      judged = relevanceSchema.parse(parseJsonObject(result.text))
    } catch {
      continue
    }
    if (!judged.relevant) continue

    const supporting = judged.supporting_chunk_ids.filter((id) => chunkIdSet.has(id))

    const { data: upserted, error: upsertError } = await db
      .from('matches')
      .upsert(
        {
          dof_note_id: noteId,
          watch_profile_id: cand.profile.id,
          score: Math.min(1, Math.max(cand.score, 0.55)),
          reason: judged.reason.slice(0, 1000),
          suggested_action: judged.suggested_action.slice(0, 1000),
          supporting_chunk_ids: supporting,
          candidate_score: cand.score,
          vector_used: cand.vectorUsed,
          ai_run_id: result.aiRunId,
        },
        { onConflict: 'dof_note_id,watch_profile_id' }
      )
      .select('id')
      .limit(1)

    if (upsertError) {
      console.warn('[ciceron] match upsert failed', upsertError.message)
      continue
    }

    let matchId =
      Array.isArray(upserted) && upserted[0]
        ? (upserted[0] as { id: string }).id
        : null

    // Prefer-return can be empty even when the upsert landed; resolve by key.
    if (!matchId) {
      const { data: existing } = await db
        .from('matches')
        .select('id')
        .eq('dof_note_id', noteId)
        .eq('watch_profile_id', cand.profile.id)
        .limit(1)
      matchId =
        Array.isArray(existing) && existing[0]
          ? (existing[0] as { id: string }).id
          : null
    }

    if (matchId) {
      await createTier0Alerts({
        matchId,
        clientId: cand.profile.client_id,
        headline: `${note.title} — ${judged.reason}`.slice(0, 400),
      })
    }
  }

  // Authoritative count = rows in DB for this note (not just this-pass upserts).
  const { count: dbMatchCount } = await db
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('dof_note_id', noteId)
  matchCount = dbMatchCount ?? 0

  await db
    .from('dof_notes')
    .update({
      match_status: matchCount > 0 ? 'matched' : 'no_match',
      last_error: null,
    })
    .eq('id', noteId)

  return { ok: true, matches: matchCount, costUsd }
}
