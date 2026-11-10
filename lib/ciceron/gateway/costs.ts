import { MODELS } from '@/lib/agents/config'

/** USD per million tokens (Anthropic list prices used for estimates). */
export const ANTHROPIC_USD_PER_MTOK = {
  [MODELS.FAST]: { input: 1, output: 5 },
  [MODELS.CREATIVE]: { input: 3, output: 15 },
} as const

export function estimateAnthropicCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates =
    model === MODELS.CREATIVE
      ? ANTHROPIC_USD_PER_MTOK[MODELS.CREATIVE]
      : ANTHROPIC_USD_PER_MTOK[MODELS.FAST]
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
}
