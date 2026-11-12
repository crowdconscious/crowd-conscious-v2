import { CICERON_EMBEDDING_MODEL } from '@/lib/ciceron/db/types'

/** Pure helper: only set embedding_model when embed succeeded. */
export function archiveEmbedUpdatePayload(
  embedOk: boolean,
  vector: number[] | null
): { embedding: number[]; embedding_model: string } | null {
  if (!embedOk || !vector) return null
  return {
    embedding: vector,
    embedding_model: CICERON_EMBEDDING_MODEL,
  }
}
