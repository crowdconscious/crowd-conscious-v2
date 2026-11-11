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
