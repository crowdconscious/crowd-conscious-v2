import { NextResponse } from 'next/server'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { isGoogleWorkspaceEnabled } from '@/lib/ciceron/integrations/google-gate'
import {
  exchangeGoogleAuthCode,
  parseOAuthState,
  storeGoogleOAuthTokens,
} from '@/lib/ciceron/integrations/google-oauth'
import { writeGoogleCookieStatus } from '@/lib/ciceron/integrations/google-provider'

export const runtime = 'nodejs'

function appBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (env) return env
  return new URL(req.url).origin
}

async function fetchGoogleAccountEmail(
  accessToken: string
): Promise<{ email: string | null; sub: string | null }> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) return { email: null, sub: null }
    const json = (await res.json()) as { email?: string; id?: string }
    return { email: json.email ?? null, sub: json.id ?? null }
  } catch {
    return { email: null, sub: null }
  }
}

/**
 * Google OAuth redirect handler. Stores encrypted tokens server-side only.
 * Never returns tokens to the client.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const prefs = `${appBaseUrl(req)}${CICERON_BASE}/preferencias/integraciones`

  if (!isGoogleWorkspaceEnabled()) {
    return NextResponse.redirect(`${prefs}?google=disabled`)
  }

  const err = url.searchParams.get('error')
  if (err) {
    return NextResponse.redirect(
      `${prefs}?google=error&reason=${encodeURIComponent(err)}`
    )
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    return NextResponse.redirect(`${prefs}?google=missing_code`)
  }

  const parsed = parseOAuthState(state)
  if (!parsed) {
    return NextResponse.redirect(`${prefs}?google=bad_state`)
  }

  const tokens = await exchangeGoogleAuthCode(code)
  if (!tokens) {
    return NextResponse.redirect(`${prefs}?google=exchange_failed`)
  }

  const profile = await fetchGoogleAccountEmail(tokens.accessToken)
  // Embed email/sub into a tiny unsigned JWT-shaped payload is unnecessary —
  // storeGoogleOAuthTokens reads idToken; pass a synthetic JSON via idToken
  // decoder or extend store. Use idToken field as base64url JSON shim:
  const shim =
    profile.email || profile.sub
      ? Buffer.from(
          JSON.stringify({ email: profile.email, sub: profile.sub })
        ).toString('base64url')
      : null
  const idTokenShim = shim ? `x.${shim}.x` : null

  const stored = await storeGoogleOAuthTokens({
    firmId: parsed.firmId,
    actorId: parsed.actorId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    scope: tokens.scope,
    idToken: idTokenShim,
  })

  if (!stored.ok) {
    return NextResponse.redirect(
      `${prefs}?google=store_failed&reason=${encodeURIComponent(stored.error)}`
    )
  }

  await writeGoogleCookieStatus('connected')
  return NextResponse.redirect(`${prefs}?google=connected`)
}
