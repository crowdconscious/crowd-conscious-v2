import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hashInviteCode,
  hashInviteCodeForInsert,
  hashSessionToken,
  inviteHashCandidates,
  isPublicDemoInviteCode,
  isSessionTokenShape,
  mintInviteCode,
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

  it('requires CICERON_INVITE_PEPPER for version 1 (fail closed)', () => {
    const prev = process.env.CICERON_INVITE_PEPPER
    delete process.env.CICERON_INVITE_PEPPER
    assert.throws(() => requireInvitePepper(1), /CICERON_INVITE_PEPPER/)
    if (prev === undefined) delete process.env.CICERON_INVITE_PEPPER
    else process.env.CICERON_INVITE_PEPPER = prev
  })

  it('requires CICERON_INVITE_PEPPER_V2 for version 2 (fail closed)', () => {
    const prev = process.env.CICERON_INVITE_PEPPER_V2
    delete process.env.CICERON_INVITE_PEPPER_V2
    assert.throws(() => requireInvitePepper(2), /CICERON_INVITE_PEPPER_V2/)
    if (prev === undefined) delete process.env.CICERON_INVITE_PEPPER_V2
    else process.env.CICERON_INVITE_PEPPER_V2 = prev
  })

  it('hashes differ by pepper version', () => {
    const prev1 = process.env.CICERON_INVITE_PEPPER
    const prev2 = process.env.CICERON_INVITE_PEPPER_V2
    process.env.CICERON_INVITE_PEPPER = 'test-pepper-v1'
    process.env.CICERON_INVITE_PEPPER_V2 = 'test-pepper-v2'
    const h1 = hashInviteCode('DESPACHO-DEMO', 1)
    const h2 = hashInviteCode('DESPACHO-DEMO', 2)
    assert.equal(h1.length, 64)
    assert.notEqual(h1, h2)
    const candidates = inviteHashCandidates('DESPACHO-DEMO')
    assert.equal(candidates.length, 2)
    assert.equal(candidates[0]?.version, 1)
    assert.equal(candidates[1]?.version, 2)
    if (prev1 === undefined) delete process.env.CICERON_INVITE_PEPPER
    else process.env.CICERON_INVITE_PEPPER = prev1
    if (prev2 === undefined) delete process.env.CICERON_INVITE_PEPPER_V2
    else process.env.CICERON_INVITE_PEPPER_V2 = prev2
  })

  it('runtime inserts use pepper_version 2', () => {
    const prev2 = process.env.CICERON_INVITE_PEPPER_V2
    process.env.CICERON_INVITE_PEPPER_V2 = 'test-pepper-v2-insert'
    const { hash, pepperVersion } = hashInviteCodeForInsert('ABCD-EFGH')
    assert.equal(pepperVersion, 2)
    assert.equal(hash, hashInviteCode('ABCD-EFGH', 2))
    if (prev2 === undefined) delete process.env.CICERON_INVITE_PEPPER_V2
    else process.env.CICERON_INVITE_PEPPER_V2 = prev2
  })

  it('mints opaque session tokens and high-entropy invite codes', () => {
    const a = mintSessionToken()
    const b = mintSessionToken()
    assert.ok(isSessionTokenShape(a))
    assert.notEqual(a, b)
    assert.equal(hashSessionToken(a).length, 64)
    const code = mintInviteCode()
    assert.match(code, /^[A-Z0-9]+(-[A-Z0-9]+)+$/)
    assert.ok(code.replace(/-/g, '').length >= 16)
  })
})
