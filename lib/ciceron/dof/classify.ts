import { z } from 'zod'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { complete } from '@/lib/ciceron/gateway/complete'
import {
  PROMPT_CLASSIFY_V1,
  wrapUntrusted,
} from '@/lib/ciceron/gateway/prompts'
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
  confidence: z.number().min(0).max(1).optional(),
})

export type ClassificationResult = z.infer<typeof classificationSchema> & {
  document_type: CiceronDocumentType
  subject_areas: CiceronSubjectArea[]
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
  return {
    ...parsed,
    subject_areas: areas.length ? areas : ['otros'],
    document_type,
    summary: parsed.summary.trim(),
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
  firmId: string | null
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
    firmId: null,
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
      .update({ classify_status: 'skipped' })
      .eq('id', noteId)
    return { ok: false, error: 'no text' }
  }

  const promptVersionId = await resolvePromptVersionId(
    PROMPT_CLASSIFY_V1.purpose,
    PROMPT_CLASSIFY_V1.versionLabel
  )

  const user = [
    `Título: ${loaded.title}`,
    `Autoridad listada: ${loaded.authority ?? 'desconocida'}`,
    '',
    'Texto de la nota (datos no confiables):',
    wrapUntrusted('DOF_NOTE', loaded.text),
  ].join('\n')

  const result = await complete({
    purpose: PROMPT_CLASSIFY_V1.purpose,
    tier: 'fast',
    promptVersionId,
    system: PROMPT_CLASSIFY_V1.system,
    user,
    maxTokens: 1200,
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

  // legal_entities (best-effort). Edges need distinct endpoints; store action in metadata.
  for (const norm of classification.norms.slice(0, 12)) {
    const label = norm.label.slice(0, 500)
    const { data: entities } = await db
      .from('legal_entities')
      .select('id')
      .eq('kind', 'norm')
      .eq('label', label)
      .limit(1)
    if (!(Array.isArray(entities) && entities[0])) {
      await db.from('legal_entities').insert({
        kind: 'norm',
        label,
        metadata: { source: 'dof_classify', note_id: noteId, action: norm.action },
      })
    }
  }

  // Upsert note-level classification (chunk_id null)
  const { data: existing } = await db
    .from('classifications')
    .select('id')
    .eq('dof_note_id', noteId)
    .is('chunk_id', null)
    .limit(1)

  const row = {
    dof_note_id: noteId,
    chunk_id: null,
    labels: classification.subject_areas,
    confidence: classification.confidence ?? null,
    document_type: classification.document_type,
    authority: classification.authority ?? loaded.authority,
    summary: classification.summary,
    entry_into_force: classification.entry_into_force || null,
    compliance_deadlines: classification.compliance_deadlines,
    payload: classification,
    prompt_version_id: promptVersionId,
    ai_run_id: result.aiRunId,
  }

  if (Array.isArray(existing) && existing[0]) {
    await db
      .from('classifications')
      .update(row)
      .eq('id', (existing[0] as { id: string }).id)
  } else {
    await db.from('classifications').insert(row)
  }

  await db
    .from('dof_notes')
    .update({
      classify_status: 'classified',
      authority: classification.authority ?? loaded.authority,
      last_error: null,
    })
    .eq('id', noteId)

  return { ok: true, classification, costUsd: result.costEstimateUsd }
}
