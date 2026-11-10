import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { CICERON_SEED } from './seed-ids'

/**
 * Gate documentation + static checks for Prompt 1 isolation.
 * Live RLS assertions run via supabase/migrations/298_ciceron.verify.sql
 * on a Supabase branch (this environment has no DB access).
 */
describe('ciceron isolation contracts', () => {
  it('seed ids are stable UUIDs for two firms', () => {
    assert.notEqual(CICERON_SEED.firmDemo, CICERON_SEED.firmContraste)
    assert.match(CICERON_SEED.firmDemo, /^[0-9a-f-]{36}$/i)
    assert.match(CICERON_SEED.users.firmB, /^[0-9a-f-]{36}$/i)
  })

  it('verify script encodes the cross-tenant gate', () => {
    const sql = readFileSync('supabase/migrations/298_ciceron.verify.sql', 'utf8')
    assert.match(sql, /cross-tenant/i)
    assert.match(sql, /search_chunks/)
    assert.match(sql, /tier 2 delivery/)
    assert.match(sql, /append-only/)
    assert.match(sql, /pasante/)
    assert.match(sql, /Despacho Demo/)
  })

  it('seed labels Datos de demostración', () => {
    const sql = readFileSync('supabase/migrations/301_ciceron_seed.sql', 'utf8')
    assert.match(sql, /Datos de demostración/)
    assert.match(sql, /Despacho Demo, S\.C\./)
    assert.match(sql, /Bufete Contraste/)
    assert.doesNotMatch(sql, /crowdconscious\.app/i)
  })
})
