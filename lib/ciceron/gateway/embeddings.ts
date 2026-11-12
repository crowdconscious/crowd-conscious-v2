import { embedMany } from 'ai'
import {
  CICERON_EMBEDDING_DIMENSION,
  CICERON_EMBEDDING_MODEL,
} from '@/lib/ciceron/db/types'
import { recordAiRun } from '@/lib/ciceron/gateway/ai-runs'
import { assertGatewayBudget } from '@/lib/ciceron/gateway/budget'
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
      reason:
        | 'missing_api_key'
        | 'empty_input'
        | 'provider_error'
        | 'gateway_unavailable'
        | 'budget'
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
 * True when AI Gateway auth is available:
 * - Production/preview on Vercel: OIDC (`VERCEL_OIDC_TOKEN` / automatic)
 * - Local: `AI_GATEWAY_API_KEY`
 */
export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL_ENV
  )
}

/**
 * Embedding via Vercel AI Gateway (`openai/text-embedding-3-small` @ 1536).
 * Fail-soft when the gateway is unavailable — notes stay embedding_pending.
 */
export async function embedTexts(
  texts: string[],
  opts: EmbedOptions = {}
): Promise<EmbedResult> {
  const purpose = opts.purpose ?? 'embed_chunks'
  const inputTokens = texts.reduce((n, t) => n + estimateTokens(t), 0)

  const budget = await assertGatewayBudget({
    firmId: opts.firmId,
    purpose,
  })
  if (!budget.ok) {
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose: `${purpose}:skipped_budget`,
        model: CICERON_EMBEDDING_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        costEstimateUsd: 0,
        firmId: opts.firmId,
        matterId: opts.matterId,
        userId: opts.userId,
      })
    }
    return {
      ok: false,
      reason: 'budget',
      message: budget.message,
      inputTokens: 0,
    }
  }

  if (!texts.length) {
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
    return {
      ok: false,
      reason: 'empty_input',
      message: 'No texts to embed.',
      inputTokens: 0,
    }
  }

  // Local without key and not on Vercel → skip cleanly
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_ENV && !process.env.VERCEL_OIDC_TOKEN) {
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose: `${purpose}:skipped_gateway_unavailable`,
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
      reason: 'gateway_unavailable',
      message:
        'AI Gateway unavailable (set AI_GATEWAY_API_KEY locally, or enable AI Gateway / OIDC on Vercel). Chunks stay embedding_pending.',
      inputTokens,
    }
  }

  const started = Date.now()
  try {
    const result = await embedMany({
      model: CICERON_EMBEDDING_MODEL,
      values: texts,
    })
    const vectors = result.embeddings
    if (vectors.length !== texts.length) {
      throw new Error(`Expected ${texts.length} vectors, got ${vectors.length}`)
    }
    for (const v of vectors) {
      if (v.length !== CICERON_EMBEDDING_DIMENSION) {
        throw new Error(`Unexpected embedding dimension ${v.length}`)
      }
    }
    const tokens =
      result.usage?.tokens ??
      // older SDK shapes
      (result.usage as { promptTokens?: number } | undefined)?.promptTokens ??
      inputTokens
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
    const unavailable =
      /ai_gateway|unauthorized|401|403|oidc|api key|fetch failed|enotfound/i.test(
        message
      )
    if (opts.recordRun !== false) {
      await recordAiRun({
        purpose: `${purpose}:${unavailable ? 'skipped_gateway_unavailable' : 'provider_error'}`,
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
    return {
      ok: false,
      reason: unavailable ? 'gateway_unavailable' : 'provider_error',
      message,
      inputTokens,
    }
  }
}

export function embeddingConfig() {
  return {
    model: CICERON_EMBEDDING_MODEL,
    dimension: CICERON_EMBEDDING_DIMENSION,
    hasGatewayAuth: hasAiGatewayAuth(),
    /** @deprecated use hasGatewayAuth — kept for older call sites */
    hasApiKey: hasAiGatewayAuth(),
  }
}
