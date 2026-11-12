import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hashInviteCode,
  hashSessionToken,
  isPublicDemoInviteCode,
  isSessionTokenShape,
  mintSessionToken,
  normalizeInviteCode,
  PUBLIC_DEMO_INVITE_CODES,
  requireInvitePepper,
} from './invite-hash'

describe('ciceron invite-hash', () => {
  it('normalizes codes to uppercase', () => {
    assert.equal(normalizeInviteCode('  despacho-demo '), 'DESPACHO-DEMO')
  })

  it('recognizes only intentionally public demo codes', () => {
    assert.deepEqual([...PUBLIC_DEMO_INVITE_CODES], ['DESPACHO-DEMO', 'DESPACHO-PASANTE'])
    assert.equal(isPublicDemoInviteCode('despacho-demo'), true)
    assert.equal(isPublicDemoInviteCode('DESPACHO-PASANTE'), true)
    assert.equal(isPublicDemoInviteCode('DESPACHO-ADMIN'), false)
  })

  it('requires CICERON_INVITE_PEPPER (fail closed)', () => {
    const prev = process.env.CICERON_INVITE_PEPPER
    delete process.env.CICERON_INVITE_PEPPER
    assert.throws(() => requireInvitePepper(), /CICERON_INVITE_PEPPER/)
    if (prev === undefined) delete process.env.CICERON_INVITE_PEPPER
    else process.env.CICERON_INVITE_PEPPER = prev
  })

  it('hashes with an explicit pepper argument (pepper never committed)', () => {
    const pepper = 'test-only-pepper-not-for-production'
    const a = hashInviteCode('DESPACHO-DEMO', pepper)
    const b = hashInviteCode('despacho-demo', pepper)
    assert.equal(a.length, 64)
    assert.match(a, /^[0-9a-f]{64}$/)
    assert.equal(a, b)
    assert.notEqual(hashInviteCode('DESPACHO-PASANTE', pepper), a)
  })

  it('mints opaque session tokens', () => {
    const a = mintSessionToken()
    const b = mintSessionToken()
    assert.ok(isSessionTokenShape(a))
    assert.notEqual(a, b)
    assert.equal(hashSessionToken(a).length, 64)
  })
})
