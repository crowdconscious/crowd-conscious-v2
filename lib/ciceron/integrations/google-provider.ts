/**
 * Google Workspace provider — OAuth with minimal scopes; drafts only.
 * Gated by CICERON_GOOGLE_ENABLED. No automatic email send.
 *
 * Owner setup:
 * 1. Google Cloud project → OAuth consent screen (Internal or External)
 * 2. Create OAuth client (Web) with redirect URI
 * 3. Enable Gmail API, Calendar API, Drive API
 * 4. Set GOOGLE_OAUTH_CLIENT_ID / SECRET / REDIRECT_URI
 * 5. Set CICERON_GOOGLE_ENABLED=true after review
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

export function createGoogleWorkspaceProvider(): WorkspaceProvider {
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
      // Draft only — never call users.messages.send. Real Gmail drafts.create
      // requires stored OAuth tokens (vault) after owner enables the flag.
      return {
        ok: true,
        draftId: `gmail-draft-${Date.now()}`,
        mode: 'draft_only',
      }
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
      return { ok: true, eventId: `gcal-${Date.now()}` }
    },

    async listDriveDocuments(): Promise<DriveDocument[]> {
      if (!isGoogleWorkspaceEnabled()) return []
      return [
        {
          id: 'gdrive-sample-1',
          title: 'Contrato marco (muestra Drive)',
          folderPath: 'Drive / Clientes / Muestra',
          docDate: '2026-01-15',
          excerpt:
            'Documento de demostración. Sin lectura real de Drive hasta OAuth.',
        },
      ]
    },

    async getStatus(): Promise<WorkspaceConnectionStatus> {
      if (!isGoogleWorkspaceEnabled()) return 'disconnected'
      return readGoogleCookieStatus()
    },
  }
}
