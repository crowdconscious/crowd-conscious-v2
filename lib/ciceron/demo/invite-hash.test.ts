import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CICERON_INVITE_PEPPER_DEFAULT,
  hashInviteCode,
  hashSessionToken,
  isSessionTokenShape,
  mintSessionToken,
  normalizeInviteCode,
} from './invite-hash'

describe('ciceron invite-hash', () => {
  it('normalizes codes to uppercase', () => {
    assert.equal(normalizeInviteCode('  despacho-demo '), 'DESPACHO-DEMO')
  })

  it('matches migration seed hashes for DESPACHO-DEMO and DESPACHO-PASANTE', () => {
    assert.equal(
      hashInviteCode('DESPACHO-DEMO', CICERON_INVITE_PEPPER_DEFAULT),
      '3e88bb2a453f689e314810c301bbf790a09d5ee1afb4e0e0147dd0727c2b7f78'
    )
    assert.equal(
      hashInviteCode('DESPACHO-PASANTE', CICERON_INVITE_PEPPER_DEFAULT),
      'b68b3f391c07312e458cb97345b4dd4e180f77cc823f069f5c17a4acbe70938e'
    )
  })

  it('mints opaque session tokens', () => {
    const a = mintSessionToken()
    const b = mintSessionToken()
    assert.ok(isSessionTokenShape(a))
    assert.notEqual(a, b)
    assert.equal(hashSessionToken(a).length, 64)
  })
})
