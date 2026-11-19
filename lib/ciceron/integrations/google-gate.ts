/** CICERON_GOOGLE_ENABLED kill switch (default off). */

export function isGoogleWorkspaceEnabled(
  raw: string | undefined = process.env.CICERON_GOOGLE_ENABLED
): boolean {
  const v = raw?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

export type GoogleOAuthEnv = {
  clientId: string | null
  clientSecret: string | null
  redirectUri: string | null
}

export function readGoogleOAuthEnv(
  env: Record<string, string | undefined> = process.env
): GoogleOAuthEnv {
  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID?.trim() || null,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || null,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || null,
  }
}
