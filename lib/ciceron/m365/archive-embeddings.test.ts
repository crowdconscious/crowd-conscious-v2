import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CICERON_EMBEDDING_MODEL } from '@/lib/ciceron/db/types'
import { archiveEmbedUpdatePayload } from '@/lib/ciceron/m365/archive-embeddings-policy'

describe('archiveEmbedUpdatePayload', () => {
  it('returns null when embed failed — never sets embedding_model', () => {
    assert.equal(archiveEmbedUpdatePayload(false, Array(8).fill(0.1)), null)
    assert.equal(archiveEmbedUpdatePayload(true, null), null)
  })

  it('sets embedding_model only after successful embed', () => {
    const vector = Array(8).fill(0.25)
    const payload = archiveEmbedUpdatePayload(true, vector)
    assert.ok(payload)
    assert.equal(payload!.embedding_model, CICERON_EMBEDDING_MODEL)
    assert.equal(payload!.embedding, vector)
  })
})
