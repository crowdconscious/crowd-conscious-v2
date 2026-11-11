import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { embedTexts, embeddingConfig } from './embeddings'
import {
  CICERON_EMBEDDING_DIMENSION,
  CICERON_EMBEDDING_MODEL,
} from '@/lib/ciceron/db/types'

describe('ciceron embeddings gateway', () => {
  it('reports locked gateway model and dimension', () => {
    const cfg = embeddingConfig()
    assert.equal(cfg.model, CICERON_EMBEDDING_MODEL)
    assert.equal(cfg.dimension, CICERON_EMBEDDING_DIMENSION)
    assert.match(cfg.model, /^openai\//)
  })

  it('fails soft when AI Gateway auth is absent locally', async () => {
    const prevKey = process.env.AI_GATEWAY_API_KEY
    const prevOidc = process.env.VERCEL_OIDC_TOKEN
    const prevEnv = process.env.VERCEL_ENV
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    delete process.env.VERCEL_ENV
    try {
      const result = await embedTexts(['hola mundo jurídico'], { recordRun: false })
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.reason, 'gateway_unavailable')
    } finally {
      if (prevKey !== undefined) process.env.AI_GATEWAY_API_KEY = prevKey
      if (prevOidc !== undefined) process.env.VERCEL_OIDC_TOKEN = prevOidc
      if (prevEnv !== undefined) process.env.VERCEL_ENV = prevEnv
    }
  })

  it('rejects empty input without throwing', async () => {
    const result = await embedTexts([], { recordRun: false })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'empty_input')
  })
})
