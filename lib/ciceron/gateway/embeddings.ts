import {
  CICERON_EMBEDDING_DIMENSION,
  CICERON_EMBEDDING_MODEL,
} from '@/lib/ciceron/db/types'

export type EmbedResult =
  | {
      ok: true
      model: typeof CICERON_EMBEDDING_MODEL
      dimension: typeof CICERON_EMBEDDING_DIMENSION
      vectors: number[][]
    }
  | {
      ok: false
      reason: 'missing_api_key' | 'empty_input' | 'provider_error'
      message: string
    }

/**
 * Embedding gateway stub (Prompt 1). Full HTTP call lands with DOF ingest (Prompt 3).
 * Must fail gracefully when OPENAI_API_KEY is absent — no throw for missing key.
 */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  if (!texts.length) {
    return { ok: false, reason: 'empty_input', message: 'No texts to embed.' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      reason: 'missing_api_key',
      message:
        'OPENAI_API_KEY is not set. Cicéron embeddings are disabled until the key is provisioned.',
    }
  }

  // Prompt 3 wires the provider call. Refuse accidental use before then.
  return {
    ok: false,
    reason: 'provider_error',
    message:
      'Embedding HTTP client not implemented yet (Prompt 3). Key is present; pipeline pending.',
  }
}

export function embeddingConfig() {
  return {
    model: CICERON_EMBEDDING_MODEL,
    dimension: CICERON_EMBEDDING_DIMENSION,
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
  }
}
