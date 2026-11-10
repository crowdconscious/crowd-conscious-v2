import {
  CICERON_EMBEDDING_DIMENSION,
  CICERON_EMBEDDING_MODEL,
} from '@/lib/ciceron/db/types'
import { recordAiRun } from '@/lib/ciceron/gateway/ai-runs'
import { estimateTokens } from '@/lib/ciceron/dof/chunk'

/** text-embedding-3-small list price (USD / 1M tokens) — planning estimate. */
export const EMBEDDING_USD_PER_MILLION = 0.02

export type EmbedResult =
  | {
      ok: true
      model: typeof CICERON_EMBEDDING_MODEL
      dimension: typeof CICERON_EMBEDDING_DIMENSION
      vectors: number[][]
      inputTokens: number
      costEstimateUsd: number
      latencyMs: number
    }
  | {
      ok: false
      reason: 'missing_api_key' | 'empty_input' | 'provider_error'
      message: string
      inputTokens?: number
    }

export type EmbedOptions = {
  purpose?: string
  firmId?: string | null
  matterId?: string | null
  userId?: string | null
  /** When true (default), write ai_runs including skips. */
  recordRun?: boolean
}

/**
 * Embedding gateway. Fail-soft when OPENAI_API_KEY is absent.
 * Always records an ai_runs row (including skips) unless recordRun=false.
 */
export async function embedTexts(
  texts: string[],
  opts: EmbedOptions = {}
): Promise<EmbedResult> {
  const purpose = opts.purpose ?? 'embed_chunks'
  const inputTokens = texts.reduce((n, t) => n + estimateTokens(t), 0)

  if (!texts.length) {
    const result: EmbedResult = {
      ok: false,
      reason: 'empty_input',
      message: 'No texts to embed.',
      inputTokens: 0,
    }
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose,
        model: CICERON_EMBEDDING_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        costEstimateUsd: 0,
        firmId: opts.firmId,
        matterId: opts.matterId,
        userId: opts.userId,
      })
    }
    return result
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose: `${purpose}:skipped_missing_api_key`,
        model: CICERON_EMBEDDING_MODEL,
        inputTokens,
        outputTokens: 0,
        costEstimateUsd: 0,
        firmId: opts.firmId,
        matterId: opts.matterId,
        userId: opts.userId,
      })
    }
    return {
      ok: false,
      reason: 'missing_api_key',
      message:
        'OPENAI_API_KEY is not set. Chunks stored with embedding pending for later back-fill.',
      inputTokens,
    }
  }

  const started = Date.now()
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CICERON_EMBEDDING_MODEL,
        input: texts,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`OpenAI embeddings HTTP ${res.status}: ${body.slice(0, 200)}`)
    }
    const json = (await res.json()) as {
      data?: { embedding: number[]; index: number }[]
      usage?: { prompt_tokens?: number; total_tokens?: number }
    }
    const vectors = (json.data ?? [])
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding)
    if (vectors.length !== texts.length) {
      throw new Error(`Expected ${texts.length} vectors, got ${vectors.length}`)
    }
    for (const v of vectors) {
      if (v.length !== CICERON_EMBEDDING_DIMENSION) {
        throw new Error(`Unexpected embedding dimension ${v.length}`)
      }
    }
    const tokens = json.usage?.total_tokens ?? json.usage?.prompt_tokens ?? inputTokens
    const cost = (tokens / 1_000_000) * EMBEDDING_USD_PER_MILLION
    const latencyMs = Date.now() - started
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose,
        model: CICERON_EMBEDDING_MODEL,
        inputTokens: tokens,
        outputTokens: 0,
        costEstimateUsd: cost,
        latencyMs,
        firmId: opts.firmId,
        matterId: opts.matterId,
        userId: opts.userId,
      })
    }
    return {
      ok: true,
      model: CICERON_EMBEDDING_MODEL,
      dimension: CICERON_EMBEDDING_DIMENSION,
      vectors,
      inputTokens: tokens,
      costEstimateUsd: cost,
      latencyMs,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose: `${purpose}:provider_error`,
        model: CICERON_EMBEDDING_MODEL,
        inputTokens,
        outputTokens: 0,
        costEstimateUsd: 0,
        latencyMs: Date.now() - started,
        firmId: opts.firmId,
        matterId: opts.matterId,
        userId: opts.userId,
      })
    }
    return { ok: false, reason: 'provider_error', message, inputTokens }
  }
}

export function embeddingConfig() {
  return {
    model: CICERON_EMBEDDING_MODEL,
    dimension: CICERON_EMBEDDING_DIMENSION,
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
  }
}
