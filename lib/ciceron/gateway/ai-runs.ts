import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'

export type AiRunInsert = {
  purpose: string
  model: string
  promptVersionId?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  costEstimateUsd?: number | null
  latencyMs?: number | null
  retrievedChunkIds?: string[]
  firmId?: string | null
  matterId?: string | null
  userId?: string | null
}

/** Best-effort ai_runs insert (service role). Never throws to callers. */
export async function recordAiRun(row: AiRunInsert): Promise<string | null> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  try {
    const { data, error } = await db.from('ai_runs').insert({
      purpose: row.purpose,
      model: row.model,
      prompt_version_id: row.promptVersionId ?? null,
      input_tokens: row.inputTokens ?? null,
      output_tokens: row.outputTokens ?? null,
      cost_estimate_usd: row.costEstimateUsd ?? null,
      latency_ms: row.latencyMs ?? null,
      retrieved_chunk_ids: row.retrievedChunkIds ?? [],
      firm_id: row.firmId ?? null,
      matter_id: row.matterId ?? null,
      user_id: row.userId ?? null,
    }).select('id').limit(1)

    if (error) {
      console.warn('[ciceron] ai_runs insert failed', error.message)
      return null
    }
    const id = Array.isArray(data) && data[0] ? (data[0] as { id: string }).id : null
    return id
  } catch (err) {
    console.warn('[ciceron] ai_runs insert error', err)
    return null
  }
}
