'use server'

import { revalidatePath } from 'next/cache'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { answerResearchQuestion } from '@/lib/ciceron/research/answer'

export type AskResearchState = {
  ok: boolean
  message?: string
  body?: string
  unverifiedSection?: string | null
  refused?: boolean
  degraded?: boolean
  degradeReason?: string | null
  coverageNote?: string
  sources?: Array<{
    chunkId: string
    title: string | null
    authority: string | null
    noteDate: string | null
    officialUrl: string | null
    passage: string
  }>
  searchedQueries?: string[]
  aiOutputId?: string | null
  researchQueryId?: string | null
  status?: 'borrador'
  question?: string
}

export async function askResearch(
  _prev: AskResearchState,
  formData: FormData
): Promise<AskResearchState> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }

  const question = String(formData.get('question') ?? '').trim()
  const matterRaw = String(formData.get('matterId') ?? '').trim()
  const matterId = matterRaw || null
  const followUp = String(formData.get('followUpOf') ?? '').trim()

  const fullQuestion = followUp
    ? `${question}\n\n(Contexto de seguimiento; respuesta previa id ${followUp})`
    : question

  const result = await answerResearchQuestion({
    question: fullQuestion,
    actorId: persona.id,
    firmId: persona.firmId,
    matterId,
  })

  if (!result.ok) {
    return { ok: false, message: result.message }
  }

  revalidatePath('/ciceron/investigacion')
  return {
    ok: true,
    body: result.body,
    unverifiedSection: result.unverifiedSection,
    refused: result.refused,
    degraded: result.degraded,
    degradeReason: result.degradeReason,
    coverageNote: result.coverageNote,
    sources: result.sources,
    searchedQueries: result.searchedQueries,
    aiOutputId: result.aiOutputId,
    researchQueryId: result.researchQueryId,
    status: 'borrador',
    question: result.question,
  }
}

export async function saveResearchFeedback(formData: FormData): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const researchQueryId = String(formData.get('researchQueryId') ?? '')
  const feedback = String(formData.get('feedback') ?? '')
  const comment = String(formData.get('comment') ?? '').slice(0, 1000)
  if (
    !researchQueryId ||
    (feedback !== 'useful' && feedback !== 'incorrect' && feedback !== 'incomplete')
  ) {
    return
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  await db
    .from('research_queries')
    .update({ feedback, feedback_comment: comment || null })
    .eq('id', researchQueryId)
    .eq('firm_id', persona.firmId)

  await db.from('audit_events').insert({
    firm_id: persona.firmId,
    user_id: persona.id,
    action: 'research_feedback',
    entity_type: 'research_queries',
    entity_id: researchQueryId,
    payload: { feedback, comment },
  })

  revalidatePath('/ciceron/investigacion')
}

export async function sendResearchToReview(formData: FormData): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  if (persona.role === 'pasante') return

  const aiOutputId = String(formData.get('aiOutputId') ?? '')
  const matterId = String(formData.get('matterId') ?? '')
  if (!aiOutputId || !matterId) return

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  await db
    .from('ai_outputs')
    .update({ status: 'en_revision' })
    .eq('id', aiOutputId)

  await db.from('review_tasks').insert({
    matter_id: matterId,
    ai_output_id: aiOutputId,
    assignee_id: persona.id,
    status: 'pendiente',
  })

  await db.from('audit_events').insert({
    firm_id: persona.firmId,
    user_id: persona.id,
    action: 'research_sent_to_review',
    entity_type: 'ai_outputs',
    entity_id: aiOutputId,
    payload: { matter_id: matterId },
  })

  revalidatePath('/ciceron/investigacion')
  revalidatePath('/ciceron/revision')
}

export async function loadResearchHistory(matterId: string | null) {
  const persona = await getCiceronDemoSession()
  if (!persona) return []
  const db = tryCreateCiceronAdminClient()
  if (!db) return []

  let q = db
    .from('research_queries')
    .select('id, question, created_at, degraded, ai_output_id, matter_id')
    .eq('firm_id', persona.firmId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (matterId) q = q.eq('matter_id', matterId)

  const { data } = await q
  return (Array.isArray(data) ? data : []) as Array<{
    id: string
    question: string
    created_at: string
    degraded: boolean
    ai_output_id: string | null
    matter_id: string | null
  }>
}

/** Load a stored research_queries row + ai_outputs body for the desk renderer. */
export async function loadPastResearchAnswer(
  researchQueryId: string
): Promise<AskResearchState> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sesión no válida.' }
  if (!researchQueryId) return { ok: false, message: 'Consulta no válida.' }

  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, message: 'No fue posible cargar la consulta.' }

  const { data: rows } = await db
    .from('research_queries')
    .select(
      'id, question, degraded, coverage_note, retrieved_chunk_ids, ai_output_id, matter_id'
    )
    .eq('id', researchQueryId)
    .eq('firm_id', persona.firmId)
    .limit(1)

  const row =
    Array.isArray(rows) && rows[0]
      ? (rows[0] as {
          id: string
          question: string
          degraded: boolean
          coverage_note: string | null
          retrieved_chunk_ids: string[] | null
          ai_output_id: string | null
          matter_id: string | null
        })
      : null
  if (!row) return { ok: false, message: 'Consulta no encontrada.' }

  let body = ''
  if (row.ai_output_id) {
    const { data: outs } = await db
      .from('ai_outputs')
      .select('id, body, status')
      .eq('id', row.ai_output_id)
      .limit(1)
    const out =
      Array.isArray(outs) && outs[0]
        ? (outs[0] as { id: string; body: string; status: string })
        : null
    body = out?.body ?? ''
  }

  const chunkIds = [...new Set((row.retrieved_chunk_ids ?? []).filter(Boolean))]
  const sources: NonNullable<AskResearchState['sources']> = []

  for (const chunkId of chunkIds.slice(0, 20)) {
    const { data: chunks } = await db
      .from('chunks')
      .select('id, text, document_id')
      .eq('id', chunkId)
      .limit(1)
    const chunk =
      Array.isArray(chunks) && chunks[0]
        ? (chunks[0] as {
            id: string
            text: string
            document_id: string | null
          })
        : null
    if (!chunk) continue

    let authority: string | null = null
    let noteDate: string | null = null
    let title: string | null = null
    let officialUrl: string | null = null

    if (chunk.document_id) {
      const { data: docs } = await db
        .from('documents')
        .select('id, title, official_url')
        .eq('id', chunk.document_id)
        .limit(1)
      const doc =
        Array.isArray(docs) && docs[0]
          ? (docs[0] as {
              id: string
              title: string | null
              official_url: string | null
            })
          : null
      if (doc) {
        title = doc.title
        officialUrl = doc.official_url
        const { data: notes } = await db
          .from('dof_notes')
          .select('note_date, authority, title')
          .eq('document_id', doc.id)
          .limit(1)
        const note =
          Array.isArray(notes) && notes[0]
            ? (notes[0] as {
                note_date: string
                authority: string | null
                title: string | null
              })
            : null
        if (note) {
          noteDate = note.note_date
          authority = note.authority
          title = title || note.title
        }
      }
    }

    sources.push({
      chunkId: chunk.id,
      title,
      authority,
      noteDate,
      officialUrl,
      passage: chunk.text.slice(0, 600),
    })
  }

  return {
    ok: true,
    body,
    degraded: row.degraded,
    degradeReason: null,
    coverageNote: row.coverage_note ?? undefined,
    sources,
    aiOutputId: row.ai_output_id,
    researchQueryId: row.id,
    status: 'borrador',
    question: row.question,
  }
}
