import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  decryptSecret,
  encryptSecret,
  readTokenEncryptionKey,
} from './token-crypto'

describe('token-crypto', () => {
  it('round-trips with hex key', () => {
    const key = readTokenEncryptionKey({
      CICERON_TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    })
    assert.ok(key)
    const blob = encryptSecret('refresh-token-demo', key!)
    assert.notEqual(blob.ciphertext, 'refresh-token-demo')
    assert.equal(decryptSecret(blob, key!), 'refresh-token-demo')
  })

  it('rejects missing key', () => {
    assert.equal(readTokenEncryptionKey({}), null)
  })
})
