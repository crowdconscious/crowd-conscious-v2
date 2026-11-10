import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { embedTexts, embeddingConfig } from './embeddings'
import {
  CICERON_EMBEDDING_DIMENSION,
  CICERON_EMBEDDING_MODEL,
} from '@/lib/ciceron/db/types'

describe('ciceron embeddings gateway', () => {
  it('reports locked model and dimension', () => {
    const cfg = embeddingConfig()
    assert.equal(cfg.model, CICERON_EMBEDDING_MODEL)
    assert.equal(cfg.dimension, CICERON_EMBEDDING_DIMENSION)
  })

  it('fails gracefully when OPENAI_API_KEY is absent', async () => {
    const prev = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    try {
      const result = await embedTexts(['hola mundo jurídico'], { recordRun: false })
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.reason, 'missing_api_key')
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev
    }
  })

  it('rejects empty input without throwing', async () => {
    const result = await embedTexts([], { recordRun: false })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'empty_input')
  })
})
