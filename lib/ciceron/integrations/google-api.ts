import 'server-only'

import type { MailDraftInput, MailDraftResult } from './types'
import { loadGoogleOAuthTokens } from './google-oauth'

export type GoogleCalendarEvent = {
  id: string
  summary: string
  start: string
  end: string | null
  htmlLink: string | null
}

function toRfc2822Message(input: MailDraftInput): string {
  const lines = [
    `To: ${input.toEmail}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    input.body,
  ]
  return lines.join('\r\n')
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Creates a Gmail draft only — never sends. */
export async function createGmailDraft(opts: {
  firmId: string
  actorId: string
  input: MailDraftInput
  fetchImpl?: typeof fetch
}): Promise<MailDraftResult> {
  const tokens = await loadGoogleOAuthTokens({
    firmId: opts.firmId,
    actorId: opts.actorId,
  })
  if (!tokens) {
    return { ok: false, reason: 'google_not_connected' }
  }
  if (!opts.input.toEmail || !opts.input.subject) {
    return { ok: false, reason: 'missing_fields' }
  }

  const raw = toRfc2822Message(opts.input)
  const fetchFn = opts.fetchImpl ?? fetch
  const res = await fetchFn(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: { raw: toBase64Url(raw) },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return {
      ok: false,
      reason: text.slice(0, 200) || `http_${res.status}`,
    }
  }

  const json = (await res.json()) as { id?: string }
  if (!json.id) return { ok: false, reason: 'missing_draft_id' }
  return { ok: true, draftId: json.id, mode: 'draft_only' }
}

/** Lists upcoming events on the connected user's primary calendar. */
export async function listUpcomingGoogleCalendarEvents(opts: {
  firmId: string
  actorId: string
  maxResults?: number
  fetchImpl?: typeof fetch
}): Promise<
  | { ok: true; events: GoogleCalendarEvent[] }
  | { ok: false; reason: string }
> {
  const tokens = await loadGoogleOAuthTokens({
    firmId: opts.firmId,
    actorId: opts.actorId,
  })
  if (!tokens) {
    return { ok: false, reason: 'google_not_connected' }
  }

  const params = new URLSearchParams({
    maxResults: String(opts.maxResults ?? 8),
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: new Date().toISOString(),
  })
  const fetchFn = opts.fetchImpl ?? fetch
  const res = await fetchFn(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return {
      ok: false,
      reason: text.slice(0, 200) || `http_${res.status}`,
    }
  }

  const json = (await res.json()) as {
    items?: Array<{
      id?: string
      summary?: string
      htmlLink?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }>
  }

  const events: GoogleCalendarEvent[] = (json.items ?? [])
    .filter((e) => e.id)
    .map((e) => ({
      id: String(e.id),
      summary: e.summary?.trim() || '(sin título)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? null,
      htmlLink: e.htmlLink ?? null,
    }))

  return { ok: true, events }
}

/** Default Spanish client-notification draft for the demo firm. */
export function buildDemoClientNotificationDraft(): MailDraftInput {
  return {
    toEmail: 'contacto@cliente-demo.mx',
    subject: 'Actualización de su asunto — Cicerón (demostración)',
    body: [
      'Estimado cliente:',
      '',
      'Le escribimos para informarle de una novedad relevante en su asunto.',
      'Este borrador se creó desde Cicerón con Google Workspace; un abogado',
      'debe revisarlo y enviarlo manualmente.',
      '',
      'Datos de demostración.',
      '',
      'Atentamente,',
      'Despacho demo',
    ].join('\n'),
  }
}
