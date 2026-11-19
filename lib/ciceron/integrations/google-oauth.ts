import 'server-only'

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { GOOGLE_OAUTH_SCOPES } from './types'
import { readGoogleOAuthEnv } from './google-gate'
import {
  decryptSecret,
  encryptSecret,
  readTokenEncryptionKey,
  type EncryptedBlob,
} from './token-crypto'

export type GoogleTokenSet = {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  googleSub: string | null
  accountEmail: string | null
}

type TokenRow = {
  access_token_ciphertext: string
  refresh_token_ciphertext: string | null
  token_iv: string
  token_auth_tag: string
  access_token_expires_at: string | null
  scopes: string[] | null
  google_sub: string | null
  account_email: string | null
}

export function parseOAuthState(
  state: string
): { firmId: string; actorId: string } | null {
  // firm:<uuid>:actor:<uuid>
  const m = /^firm:([0-9a-f-]{36}):actor:([0-9a-f-]{36})$/i.exec(state.trim())
  if (!m) return null
  return { firmId: m[1], actorId: m[2] }
}

export async function exchangeGoogleAuthCode(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresIn: number | null
  scope: string
  idToken: string | null
} | null> {
  const env = readGoogleOAuthEnv()
  if (!env.clientId || !env.clientSecret || !env.redirectUri) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    id_token?: string
  }
  if (!json.access_token) return null
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresIn: json.expires_in ?? null,
    scope: json.scope ?? GOOGLE_OAUTH_SCOPES.join(' '),
    idToken: json.id_token ?? null,
  }
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number | null } | null> {
  const env = readGoogleOAuthEnv()
  if (!env.clientId || !env.clientSecret) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
  }
  if (!json.access_token) return null
  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in ?? null,
  }
}

function decodeJwtEmailSub(
  idToken: string | null
): { email: string | null; sub: string | null } {
  if (!idToken) return { email: null, sub: null }
  try {
    const payload = idToken.split('.')[1]
    if (!payload) return { email: null, sub: null }
    const json = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as { email?: string; sub?: string }
    return {
      email: json.email ?? null,
      sub: json.sub ?? null,
    }
  } catch {
    return { email: null, sub: null }
  }
}

export async function storeGoogleOAuthTokens(opts: {
  firmId: string
  actorId: string
  accessToken: string
  refreshToken: string | null
  expiresIn: number | null
  scope: string
  idToken: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = readTokenEncryptionKey()
  if (!key) return { ok: false, error: 'CICERON_TOKEN_ENCRYPTION_KEY missing' }
  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, error: 'db' }

  const accessEnc = encryptSecret(opts.accessToken, key)
  // Reuse same IV/tag envelope for refresh by encrypting separately with same key.
  const refreshEnc = opts.refreshToken
    ? encryptSecret(opts.refreshToken, key)
    : null
  const decoded = decodeJwtEmailSub(opts.idToken)
  const expiresAt =
    opts.expiresIn != null
      ? new Date(Date.now() + opts.expiresIn * 1000).toISOString()
      : null
  const scopes = opts.scope.split(/\s+/).filter(Boolean)
  const isDemo = opts.firmId === CICERON_SEED.firmDemo

  // Single AES-GCM envelope holding both tokens as JSON (one IV + auth tag).
  const combined = encryptSecret(
    JSON.stringify({
      accessToken: opts.accessToken,
      refreshToken: opts.refreshToken,
    }),
    key
  )
  void accessEnc
  void refreshEnc

  const row: Record<string, unknown> = {
    firm_id: opts.firmId,
    actor_id: opts.actorId,
    access_token_ciphertext: combined.ciphertext,
    refresh_token_ciphertext: null,
    token_iv: combined.iv,
    token_auth_tag: combined.authTag,
    access_token_expires_at: expiresAt,
    scopes,
    is_demo: isDemo,
    updated_at: new Date().toISOString(),
  }
  if (decoded.sub) row.google_sub = decoded.sub
  if (decoded.email) row.account_email = decoded.email

  const { error } = await db.from('google_oauth_credentials').upsert(row, {
    onConflict: 'firm_id,actor_id',
  })
  if (error) return { ok: false, error: error.message }

  await db.from('google_workspace_connections').upsert(
    {
      firm_id: opts.firmId,
      status: 'connected',
      connected_at: new Date().toISOString(),
      connected_by_actor: opts.actorId,
      disconnected_at: null,
      is_demo: isDemo,
      metadata: {
        oauth: true,
        drafts_only: true,
        account_email: decoded.email,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firm_id' }
  )

  return { ok: true }
}

export async function loadGoogleOAuthTokens(opts: {
  firmId: string
  actorId: string
}): Promise<GoogleTokenSet | null> {
  const key = readTokenEncryptionKey()
  if (!key) return null
  const db = tryCreateCiceronAdminClient()
  if (!db) return null

  const { data } = await db
    .from('google_oauth_credentials')
    .select(
      'access_token_ciphertext,refresh_token_ciphertext,token_iv,token_auth_tag,access_token_expires_at,scopes,google_sub,account_email'
    )
    .eq('firm_id', opts.firmId)
    .eq('actor_id', opts.actorId)
    .limit(1)

  const row = (Array.isArray(data) ? data[0] : null) as TokenRow | null
  if (!row) return null

  const blob: EncryptedBlob = {
    ciphertext: row.access_token_ciphertext,
    iv: row.token_iv,
    authTag: row.token_auth_tag,
  }

  let accessToken: string
  let refreshToken: string | null = null
  try {
    const plain = decryptSecret(blob, key)
    try {
      const parsed = JSON.parse(plain) as {
        accessToken?: string
        refreshToken?: string | null
      }
      if (!parsed.accessToken) return null
      accessToken = parsed.accessToken
      refreshToken = parsed.refreshToken ?? null
    } catch {
      accessToken = plain
      if (row.refresh_token_ciphertext) {
        refreshToken = decryptSecret(
          {
            ciphertext: row.refresh_token_ciphertext,
            iv: row.token_iv,
            authTag: row.token_auth_tag,
          },
          key
        )
      }
    }
  } catch {
    return null
  }

  let expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at)
    : null

  if (
    refreshToken &&
    expiresAt &&
    expiresAt.getTime() < Date.now() + 60_000
  ) {
    const refreshed = await refreshGoogleAccessToken(refreshToken)
    if (refreshed) {
      accessToken = refreshed.accessToken
      expiresAt =
        refreshed.expiresIn != null
          ? new Date(Date.now() + refreshed.expiresIn * 1000)
          : null
      await storeGoogleOAuthTokens({
        firmId: opts.firmId,
        actorId: opts.actorId,
        accessToken,
        refreshToken,
        expiresIn: refreshed.expiresIn,
        scope: (row.scopes ?? []).join(' '),
        idToken: null,
      })
    }
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    scopes: row.scopes ?? [],
    googleSub: row.google_sub,
    accountEmail: row.account_email,
  }
}

export async function clearGoogleOAuthTokens(opts: {
  firmId: string
  actorId: string
}): Promise<void> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return
  await db
    .from('google_oauth_credentials')
    .delete()
    .eq('firm_id', opts.firmId)
    .eq('actor_id', opts.actorId)
  await db
    .from('google_workspace_connections')
    .update({
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
      metadata: { oauth: false },
      updated_at: new Date().toISOString(),
    })
    .eq('firm_id', opts.firmId)
}

export async function hasStoredGoogleOAuth(opts: {
  firmId: string
  actorId: string
}): Promise<boolean> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return false
  const { data } = await db
    .from('google_oauth_credentials')
    .select('firm_id')
    .eq('firm_id', opts.firmId)
    .eq('actor_id', opts.actorId)
    .limit(1)
  return Array.isArray(data) && data.length > 0
}
