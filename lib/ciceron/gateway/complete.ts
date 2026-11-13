import { CREATIVE_THINKING_OFF, getAnthropicClient, MODELS } from '@/lib/agents/config'
import { estimateAnthropicCostUsd } from '@/lib/ciceron/gateway/costs'
import { recordAiRun } from '@/lib/ciceron/gateway/ai-runs'
import { assertGatewayBudget } from '@/lib/ciceron/gateway/budget'
import {
  anthropicAttemptRequestOptions,
  DEFAULT_MAX_RETRIES,
  DEFAULT_REQUEST_TIMEOUT_MS,
  withTimeoutRetry,
} from '@/lib/ciceron/gateway/request-timeout'

export type CompleteTier = 'fast' | 'creative'

export type CompleteArgs = {
  purpose: string
  tier: CompleteTier
  promptVersionId?: string | null
  system: string
  user: string
  maxTokens?: number
  firmId?: string | null
  matterId?: string | null
  userId?: string | null
  retrievedChunkIds?: string[]
  /** Per-attempt HTTPS timeout (default 60s). */
  timeoutMs?: number
  /** Retries after the first attempt on timeout/5xx/network (default 2). */
  maxRetries?: number
}

type CompleteRequestPolicy = {
  timeoutMs: number
  maxRetries: number
}

let requestPolicy: CompleteRequestPolicy = {
  timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  maxRetries: DEFAULT_MAX_RETRIES,
}

/** Process-wide defaults for `complete` (backfill sets via --request-timeout-ms). */
export function setCompleteRequestPolicy(
  opts: Partial<CompleteRequestPolicy>
): CompleteRequestPolicy {
  requestPolicy = {
    timeoutMs:
      opts.timeoutMs !== undefined ? opts.timeoutMs : requestPolicy.timeoutMs,
    maxRetries:
      opts.maxRetries !== undefined ? opts.maxRetries : requestPolicy.maxRetries,
  }
  return { ...requestPolicy }
}

export function getCompleteRequestPolicy(): CompleteRequestPolicy {
  return { ...requestPolicy }
}

export function resetCompleteRequestPolicy(): void {
  requestPolicy = {
    timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    maxRetries: DEFAULT_MAX_RETRIES,
  }
}

export type CompleteResult =
  | {
      ok: true
      text: string
      model: string
      inputTokens: number
      outputTokens: number
      costEstimateUsd: number
      latencyMs: number
      aiRunId: string | null
    }
  | {
      ok: false
      reason: 'missing_api_key' | 'provider_error' | 'empty' | 'budget'
      message: string
      aiRunId: string | null
    }

/**
 * Sole Anthropic chat entrypoint for Cicéron (rule 6).
 * Untrusted DOF/doc text must already be wrapped by the caller in delimited blocks.
 * Research pauses at 100% firm budget; DOF monitoring purposes remain allowed.
 */
export async function complete(args: CompleteArgs): Promise<CompleteResult> {
  const model = args.tier === 'creative' ? MODELS.CREATIVE : MODELS.FAST

  const budget = await assertGatewayBudget({
    firmId: args.firmId,
    purpose: args.purpose,
  })
  if (!budget.ok) {
    const aiRunId = await recordAiRun({
      purpose: `${args.purpose}:skipped_budget`,
      model,
      promptVersionId: args.promptVersionId,
      inputTokens: 0,
      outputTokens: 0,
      costEstimateUsd: 0,
      firmId: args.firmId,
      matterId: args.matterId,
      userId: args.userId,
      retrievedChunkIds: args.retrievedChunkIds,
    })
    return {
      ok: false,
      reason: 'budget',
      message: budget.message,
      aiRunId,
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const aiRunId = await recordAiRun({
      purpose: `${args.purpose}:skipped_missing_api_key`,
      model,
      promptVersionId: args.promptVersionId,
      inputTokens: 0,
      outputTokens: 0,
      costEstimateUsd: 0,
      firmId: args.firmId,
      matterId: args.matterId,
      userId: args.userId,
      retrievedChunkIds: args.retrievedChunkIds,
    })
    return {
      ok: false,
      reason: 'missing_api_key',
      message: 'ANTHROPIC_API_KEY is not set.',
      aiRunId,
    }
  }

  const started = Date.now()
  const timeoutMs = args.timeoutMs ?? requestPolicy.timeoutMs
  const maxRetries = args.maxRetries ?? requestPolicy.maxRetries
  try {
    const client = getAnthropicClient()
    const res = await withTimeoutRetry(
      (signal) =>
        client.messages.create(
          {
            model,
            max_tokens: args.maxTokens ?? (args.tier === 'creative' ? 2048 : 1024),
            system: args.system,
            messages: [{ role: 'user', content: args.user }],
            ...(args.tier === 'creative' ? { thinking: CREATIVE_THINKING_OFF } : {}),
          },
          anthropicAttemptRequestOptions({ timeoutMs, signal })
        ),
      { timeoutMs, maxRetries }
    )
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .filter(Boolean)
      .join('\n')
      .trim()
    const inputTokens = res.usage?.input_tokens ?? 0
    const outputTokens = res.usage?.output_tokens ?? 0
    const costEstimateUsd = estimateAnthropicCostUsd(model, inputTokens, outputTokens)
    const latencyMs = Date.now() - started
    const aiRunId = await recordAiRun({
      purpose: args.purpose,
      model,
      promptVersionId: args.promptVersionId,
      inputTokens,
      outputTokens,
      costEstimateUsd,
      latencyMs,
      firmId: args.firmId,
      matterId: args.matterId,
      userId: args.userId,
      retrievedChunkIds: args.retrievedChunkIds,
    })
    if (!text) {
      return { ok: false, reason: 'empty', message: 'Model returned empty text.', aiRunId }
    }
    return {
      ok: true,
      text,
      model,
      inputTokens,
      outputTokens,
      costEstimateUsd,
      latencyMs,
      aiRunId,
    }
  } catch (err) {
    // Message only — never log request headers or API keys.
    const message = err instanceof Error ? err.message : String(err)
    const aiRunId = await recordAiRun({
      purpose: `${args.purpose}:provider_error`,
      model,
      promptVersionId: args.promptVersionId,
      inputTokens: 0,
      outputTokens: 0,
      costEstimateUsd: 0,
      latencyMs: Date.now() - started,
      firmId: args.firmId,
      matterId: args.matterId,
      userId: args.userId,
      retrievedChunkIds: args.retrievedChunkIds,
    })
    return { ok: false, reason: 'provider_error', message, aiRunId }
  }
}
