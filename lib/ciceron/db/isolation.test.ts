import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { CICERON_SEED } from './seed-ids'

/**
 * Gate documentation + static checks for Prompt 1 isolation.
 * Live RLS assertions run via supabase/migrations/302_ciceron.verify.sql
 * on a Supabase branch (this environment has no DB access).
 */
describe('ciceron isolation contracts', () => {
  it('seed ids are stable UUIDs for two firms', () => {
    assert.notEqual(CICERON_SEED.firmDemo, CICERON_SEED.firmContraste)
    assert.match(CICERON_SEED.firmDemo, /^[0-9a-f-]{36}$/i)
    assert.match(CICERON_SEED.personas.firmB, /^[0-9a-f-]{36}$/i)
  })

  it('verify script encodes the cross-tenant gate without auth.users', () => {
    const sql = readFileSync('supabase/migrations/302_ciceron.verify.sql', 'utf8')
    assert.match(sql, /cross-tenant/i)
    assert.match(sql, /search_chunks/)
    assert.match(sql, /tier 2 delivery/)
    assert.match(sql, /append-only/)
    assert.match(sql, /pasante/)
    assert.match(sql, /set_actor/)
    assert.match(sql, /demo_personas/)
    assert.match(sql, /auth\.users/)
    assert.match(sql, /Despacho Demo/)
  })

  it('prod-safe seed labels Datos de demostración and skips auth.users', () => {
    const sql = readFileSync('supabase/migrations/302_ciceron_seed_prod_safe.sql', 'utf8')
    assert.match(sql, /Datos de demostración/)
    assert.match(sql, /Despacho Demo, S\.C\./)
    assert.match(sql, /Bufete Contraste/)
    assert.match(sql, /demo_personas/)
    assert.doesNotMatch(sql, /INSERT\s+INTO\s+auth\.users\b/)
    assert.doesNotMatch(sql, /INSERT\s+INTO\s+auth\.identities\b/)
    assert.match(sql, /Never insert into auth\.users/i)
    assert.doesNotMatch(sql, /crowdconscious\.app/i)
  })

  it('retired 301 is not an active migration', () => {
    let active301 = false
    try {
      readFileSync('supabase/migrations/301_ciceron_seed.sql', 'utf8')
      active301 = true
    } catch {
      active301 = false
    }
    assert.equal(active301, false)
    const retired = readFileSync(
      '.deprecated/ciceron-seed-auth-users/301_ciceron_seed.sql.txt',
      'utf8'
    )
    assert.match(retired, /auth\.users/)
  })
})
