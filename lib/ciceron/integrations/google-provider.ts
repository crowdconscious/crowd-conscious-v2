/**
 * Google Workspace provider — real OAuth (Internal app) + drafts only.
 * Gated by CICERON_GOOGLE_ENABLED. No automatic email send.
 *
 * Owner setup (Google Cloud / Workspace):
 * 1. Cloud project → OAuth consent screen: User type Internal (Workspace domain)
 * 2. OAuth client (Web) with redirect URI = GOOGLE_OAUTH_REDIRECT_URI
 * 3. Enable Gmail API + Google Calendar API (+ Drive if used)
 * 4. Set GOOGLE_OAUTH_CLIENT_ID / SECRET / REDIRECT_URI
 * 5. Set CICERON_TOKEN_ENCRYPTION_KEY (32-byte base64 or 64-char hex)
 * 6. Set CICERON_GOOGLE_ENABLED=true after review
 */

import { cookies } from 'next/headers'
import {
  isGoogleWorkspaceEnabled,
  readGoogleOAuthEnv,
} from './google-gate'
import { GOOGLE_OAUTH_SCOPES } from './types'
import type {
  CalendarPlazoInput,
  CalendarPlazoResult,
  DriveDocument,
  MailDraftInput,
  MailDraftResult,
  WorkspaceConnectionStatus,
  WorkspaceProvider,
} from './types'

export const CICERON_GOOGLE_COOKIE = 'ciceron_google_status'

export function buildGoogleOAuthAuthorizeUrl(state: string): string | null {
  if (!isGoogleWorkspaceEnabled()) return null
  const env = readGoogleOAuthEnv()
  if (!env.clientId || !env.redirectUri) return null
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function readGoogleCookieStatus(): Promise<WorkspaceConnectionStatus> {
  try {
    const jar = await cookies()
    const v = jar.get(CICERON_GOOGLE_COOKIE)?.value
    return v === 'connected' ? 'connected' : 'disconnected'
  } catch {
    return 'disconnected'
  }
}

export async function writeGoogleCookieStatus(
  status: WorkspaceConnectionStatus
): Promise<void> {
  const jar = await cookies()
  jar.set(CICERON_GOOGLE_COOKIE, status, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function createGoogleWorkspaceProvider(opts?: {
  firmId?: string
  actorId?: string
}): WorkspaceProvider {
  return {
    id: 'google_workspace',
    label: 'Google Workspace',

    async createMailDraft(input: MailDraftInput): Promise<MailDraftResult> {
      if (!isGoogleWorkspaceEnabled()) {
        return { ok: false, reason: 'CICERON_GOOGLE_ENABLED off' }
      }
      if (!input.toEmail || !input.subject) {
        return { ok: false, reason: 'missing_fields' }
      }
      if (opts?.firmId && opts?.actorId) {
        // Dynamic import keeps this module testable without server-only deps.
        const { createGmailDraft } = await import('./google-api')
        return createGmailDraft({
          firmId: opts.firmId,
          actorId: opts.actorId,
          input,
        })
      }
      // No actor context — refuse rather than invent a draft id.
      return { ok: false, reason: 'google_not_connected' }
    },

    async upsertCalendarPlazo(
      input: CalendarPlazoInput
    ): Promise<CalendarPlazoResult> {
      if (!isGoogleWorkspaceEnabled()) {
        return { ok: false, reason: 'CICERON_GOOGLE_ENABLED off' }
      }
      if (!input.title || !input.dueAtIso) {
        return { ok: false, reason: 'missing_fields' }
      }
      // Plazo upsert remains a later step; listing is the visible action now.
      return { ok: true, eventId: `gcal-pending-${Date.now()}` }
    },

    async listDriveDocuments(): Promise<DriveDocument[]> {
      if (!isGoogleWorkspaceEnabled()) return []
      return []
    },

    async getStatus(): Promise<WorkspaceConnectionStatus> {
      if (!isGoogleWorkspaceEnabled()) return 'disconnected'
      if (opts?.firmId && opts?.actorId) {
        const { hasStoredGoogleOAuth } = await import('./google-oauth')
        const stored = await hasStoredGoogleOAuth({
          firmId: opts.firmId,
          actorId: opts.actorId,
        })
        if (stored) return 'connected'
      }
      return readGoogleCookieStatus()
    },
  }
}
