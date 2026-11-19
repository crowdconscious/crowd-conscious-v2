/**
 * AES-256-GCM helpers for Google OAuth token vault.
 * Key from CICERON_TOKEN_ENCRYPTION_KEY (32-byte base64 or 64-char hex).
 * Ciphertext never leaves the server.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'

export function readTokenEncryptionKey(
  env: Record<string, string | undefined> = process.env
): Buffer | null {
  const raw = env.CICERON_TOKEN_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  try {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length === 32) return buf
  } catch {
    return null
  }
  return null
}

export type EncryptedBlob = {
  ciphertext: string
  iv: string
  authTag: string
}

export function encryptSecret(
  plaintext: string,
  key: Buffer
): EncryptedBlob {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptSecret(
  blob: EncryptedBlob,
  key: Buffer
): string {
  const decipher = createDecipheriv(
    ALGO,
    key,
    Buffer.from(blob.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(blob.authTag, 'base64'))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(blob.ciphertext, 'base64')),
    decipher.final(),
  ])
  return dec.toString('utf8')
}
