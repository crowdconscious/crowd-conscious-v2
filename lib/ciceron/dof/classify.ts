import { z } from 'zod'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { complete } from '@/lib/ciceron/gateway/complete'
import {
  PROMPT_CLASSIFY_V2,
  wrapUntrusted,
} from '@/lib/ciceron/gateway/prompts'
import { isWeakDofTitle } from '@/lib/ciceron/dof/display-title'
import {
  CICERON_DOCUMENT_TYPES,
  CICERON_SUBJECT_AREAS,
  inferDocumentTypeFromTitle,
  type CiceronDocumentType,
  type CiceronSubjectArea,
} from '@/lib/ciceron/taxonomy'

const classificationSchema = z.object({
  subject_areas: z.array(z.string()).default([]),
  document_type: z.string(),
  authority: z.string().nullable().optional(),
  entry_into_force: z.string().nullable().optional(),
  compliance_deadlines: z.array(z.string()).default([]),
  norms: z
    .array(
      z.object({
        label: z.string(),
        action: z.enum(['creates', 'amends', 'repeals', 'cites']),
      })
    )
    .default([]),
  summary: z.string(),
  display_title: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export type ClassificationResult = z.infer<typeof classificationSchema> & {
  document_type: CiceronDocumentType
  subject_areas: CiceronSubjectArea[]
  display_title?: string
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1]!.trim() : trimmed
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('no JSON object in model output')
  return JSON.parse(raw.slice(start, end + 1))
}

function normalizeClassification(
  parsed: z.infer<typeof classificationSchema>,
  title: string
): ClassificationResult {
  const areas = parsed.subject_areas
    .map((a) => a.trim().toLowerCase())
    .filter((a): a is CiceronSubjectArea =>
      (CICERON_SUBJECT_AREAS as readonly string[]).includes(a)
    )
  let document_type = parsed.document_type as CiceronDocumentType
  if (!(CICERON_DOCUMENT_TYPES as readonly string[]).includes(document_type)) {
    document_type = inferDocumentTypeFromTitle(title)
  }
  const display_title = (parsed.display_title ?? '').trim() || undefined
  return {
    ...parsed,
    subject_areas: areas.length ? areas : ['otros'],
    document_type,
    summary: parsed.summary.trim(),
    display_title,
    confidence: parsed.confidence ?? 0.5,
  }
}

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

async function loadNoteText(noteId: string): Promise<{
  title: string
  authority: string | null
  text: string
  noteCode: string
  documentId: string | null
} | null> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  const { data: notes } = await db
    .from('dof_notes')
    .select('id, note_code, title, authority, document_id')
    .eq('id', noteId)
    .limit(1)
  const note = Array.isArray(notes) && notes[0]
    ? (notes[0] as {
        id: string
        note_code: string
        title: string | null
        authority: string | null
        document_id: string | null
      })
    : null
  if (!note?.document_id) return null

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
  if (!versionId) return null

  const { data: chunks } = await db
    .from('chunks')
    .select('text, position')
    .eq('version_id', versionId)
    .order('position', { ascending: true })
    .limit(40)

  const text = (Array.isArray(chunks) ? chunks : [])
    .map((c) => (c as { text: string }).text)
    .join('\n\n')
  if (!text.trim()) return null

  return {
    title: note.title || `Nota ${note.note_code}`,
    authority: note.authority,
    text,
    noteCode: note.note_code,
    documentId: note.document_id,
  }
}

async function ensureEntityId(
  db: NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>,
  opts: {
    kind: string
    label: string
    externalRef?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<string | null> {
  const { data: existing } = await db
    .from('legal_entities')
    .select('id')
    .eq('kind', opts.kind)
    .eq('label', opts.label.slice(0, 500))
    .limit(1)
  if (Array.isArray(existing) && existing[0]) {
    return (existing[0] as { id: string }).id
  }
  const { data: inserted } = await db
    .from('legal_entities')
    .insert({
      kind: opts.kind,
      label: opts.label.slice(0, 500),
      external_ref: opts.externalRef ?? null,
      metadata: opts.metadata ?? {},
    })
    .select('id')
    .limit(1)
  return Array.isArray(inserted) && inserted[0]
    ? (inserted[0] as { id: string }).id
    : null
}

async function writeLegalEdges(opts: {
  noteId: string
  noteCode: string
  documentId: string | null
  norms: { label: string; action: 'creates' | 'amends' | 'repeals' | 'cites' }[]
}) {
  const db = tryCreateCiceronAdminClient()
  if (!db) return
  const sourceId = await ensureEntityId(db, {
    kind: 'norm',
    label: `DOF ${opts.noteCode}`,
    externalRef: opts.noteCode,
    metadata: { source: 'dof_note', note_id: opts.noteId },
  })
  if (!sourceId) return

  for (const norm of opts.norms.slice(0, 12)) {
    // Always upsert the norm entity (including cites); edges only for graph-changing actions.
    const targetId = await ensureEntityId(db, {
      kind: 'norm',
      label: norm.label,
      metadata: { source: 'dof_classify', note_id: opts.noteId, action: norm.action },
    })
    if (!targetId || targetId === sourceId) continue
    if (
      norm.action !== 'creates' &&
      norm.action !== 'amends' &&
      norm.action !== 'repeals'
    ) {
      continue
    }
    const edgeType = norm.action
    const { data: existingEdge } = await db
      .from('legal_edges')
      .select('id')
      .eq('from_id', sourceId)
      .eq('to_id', targetId)
      .eq('edge_type', edgeType)
      .limit(1)
    if (Array.isArray(existingEdge) && existingEdge[0]) continue
    await db.from('legal_edges').insert({
      from_id: sourceId,
      to_id: targetId,
      edge_type: edgeType,
      source_document_id: opts.documentId,
    })
  }
}

export async function classifyDofNote(noteId: string): Promise<{
  ok: boolean
  classification?: ClassificationResult
  costUsd?: number
  error?: string
}> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, error: 'no db' }

  const loaded = await loadNoteText(noteId)
  if (!loaded) {
    await db
      .from('dof_notes')
      .update({ classify_status: 'skipped', match_status: 'skipped' })
      .eq('id', noteId)
    return { ok: false, error: 'no text' }
  }

  const promptVersionId = await resolvePromptVersionId(
    PROMPT_CLASSIFY_V2.purpose,
    PROMPT_CLASSIFY_V2.versionLabel
  )

  const user = [
    `Título: ${loaded.title}`,
    `Autoridad listada: ${loaded.authority ?? 'desconocida'}`,
    '',
    'Texto de la nota (datos no confiables):',
    wrapUntrusted('DOF_NOTE', loaded.text),
  ].join('\n')

  const result = await complete({
    purpose: PROMPT_CLASSIFY_V2.purpose,
    tier: 'fast',
    promptVersionId,
    system: PROMPT_CLASSIFY_V2.system,
    user,
    maxTokens: 1400,
  })

  if (!result.ok) {
    await db
      .from('dof_notes')
      .update({ classify_status: 'failed', last_error: result.message })
      .eq('id', noteId)
    return { ok: false, error: result.message }
  }

  let classification: ClassificationResult
  try {
    const parsed = classificationSchema.parse(parseJsonObject(result.text))
    classification = normalizeClassification(parsed, loaded.title)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .from('dof_notes')
      .update({ classify_status: 'failed', last_error: message })
      .eq('id', noteId)
    return { ok: false, error: message }
  }

  await writeLegalEdges({
    noteId,
    noteCode: loaded.noteCode,
    documentId: loaded.documentId,
    norms: classification.norms,
  })

  const displayTitle =
    classification.display_title?.trim() ||
    (isWeakDofTitle(loaded.title)
      ? classification.summary.split(/(?<=\.)\s+/)[0]?.slice(0, 160)
      : undefined)

  const { data: existing } = await db
    .from('classifications')
    .select('id')
    .eq('dof_note_id', noteId)
    .is('chunk_id', null)
    .limit(1)

  const payload = {
    ...classification,
    display_title: displayTitle ?? classification.display_title ?? null,
  }

  const row: Record<string, unknown> = {
    dof_note_id: noteId,
    chunk_id: null,
    labels: classification.subject_areas,
    confidence: classification.confidence ?? null,
    document_type: classification.document_type,
    authority: classification.authority ?? loaded.authority,
    summary: classification.summary,
    entry_into_force: classification.entry_into_force || null,
    compliance_deadlines: classification.compliance_deadlines,
    payload,
    prompt_version_id: promptVersionId,
    ai_run_id: result.aiRunId,
  }
  // display_title column arrives with migration 321 — also keep in payload
  if (displayTitle) row.display_title = displayTitle

  if (Array.isArray(existing) && existing[0]) {
    await db
      .from('classifications')
      .update(row)
      .eq('id', (existing[0] as { id: string }).id)
  } else {
    await db.from('classifications').insert(row)
  }

  const noteUpdate: Record<string, unknown> = {
    classify_status: 'classified',
    authority: classification.authority ?? loaded.authority,
    last_error: null,
  }
  if (displayTitle && isWeakDofTitle(loaded.title)) {
    noteUpdate.title = displayTitle
  }

  await db.from('dof_notes').update(noteUpdate).eq('id', noteId)

  return { ok: true, classification, costUsd: result.costEstimateUsd }
}
