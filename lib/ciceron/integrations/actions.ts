'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { isGoogleWorkspaceEnabled, readGoogleOAuthEnv } from './google-gate'
import {
  writeGoogleCookieStatus,
  buildGoogleOAuthAuthorizeUrl,
} from './google-provider'
import {
  clearGoogleOAuthTokens,
  hasStoredGoogleOAuth,
} from './google-oauth'
import {
  buildDemoClientNotificationDraft,
  createGmailDraft,
  listUpcomingGoogleCalendarEvents,
} from './google-api'
import {
  savePreferredWorkspaceProvider,
} from './registry'
import type { WorkspaceProviderId } from './types'

export async function setWorkspaceProviderAction(
  formData: FormData
): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  const provider = String(formData.get('provider') ?? '') as WorkspaceProviderId
  if (provider !== 'microsoft365' && provider !== 'google_workspace') return
  if (provider === 'google_workspace' && !isGoogleWorkspaceEnabled()) return
  await savePreferredWorkspaceProvider({ persona, provider })
  revalidatePath('/ciceron/preferencias/integraciones')
  revalidatePath('/ciceron/expedientes/outlook')
}

/** Starts real Google OAuth when client env is configured; otherwise no-op. */
export async function startGoogleOAuthAction(): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  if (!isGoogleWorkspaceEnabled()) return
  const env = readGoogleOAuthEnv()
  if (!env.clientId || !env.clientSecret || !env.redirectUri) return

  const url = buildGoogleOAuthAuthorizeUrl(
    `firm:${persona.firmId}:actor:${persona.id}`
  )
  if (!url) return
  redirect(url)
}

/** Demo-only cookie/status without tokens — kept for offline screenshots. */
export async function connectGoogleSimAction(): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  if (!isGoogleWorkspaceEnabled()) return

  await writeGoogleCookieStatus('connected')
  const db = tryCreateCiceronAdminClient()
  if (db) {
    await db.from('google_workspace_connections').upsert(
      {
        firm_id: persona.firmId,
        status: 'connected',
        connected_at: new Date().toISOString(),
        connected_by_actor: persona.id,
        is_demo: true,
        metadata: { simulated: true, drafts_only: true },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'firm_id' }
    )
  }
  revalidatePath('/ciceron/preferencias/integraciones')
}

export async function disconnectGoogleAction(): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  await writeGoogleCookieStatus('disconnected')
  await clearGoogleOAuthTokens({
    firmId: persona.firmId,
    actorId: persona.id,
  })
  const db = tryCreateCiceronAdminClient()
  if (db) {
    await db
      .from('google_workspace_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
      })
      .eq('firm_id', persona.firmId)
  }
  revalidatePath('/ciceron/preferencias/integraciones')
}

/** @deprecated alias */
export async function disconnectGoogleSimAction(): Promise<void> {
  return disconnectGoogleAction()
}

export async function getGoogleAuthorizeUrlAction(): Promise<string | null> {
  const persona = await getCiceronDemoSession()
  if (!persona) return null
  return buildGoogleOAuthAuthorizeUrl(`firm:${persona.firmId}:actor:${persona.id}`)
}

export async function createGoogleClientDraftAction(): Promise<{
  ok: boolean
  message: string
  draftId?: string
}> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión' }
  if (!isGoogleWorkspaceEnabled()) {
    return { ok: false, message: 'CICERON_GOOGLE_ENABLED off' }
  }
  const connected = await hasStoredGoogleOAuth({
    firmId: persona.firmId,
    actorId: persona.id,
  })
  if (!connected) {
    return { ok: false, message: 'Conecte Google Workspace primero' }
  }

  const result = await createGmailDraft({
    firmId: persona.firmId,
    actorId: persona.id,
    input: buildDemoClientNotificationDraft(),
  })
  revalidatePath('/ciceron/preferencias/integraciones')
  if (!result.ok) {
    return { ok: false, message: result.reason }
  }
  return {
    ok: true,
    message: `Borrador Gmail creado (${result.draftId}). No se envió.`,
    draftId: result.draftId,
  }
}

export async function listGoogleCalendarAction(): Promise<{
  ok: boolean
  message: string
  events: Array<{ id: string; summary: string; start: string }>
}> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión', events: [] }
  if (!isGoogleWorkspaceEnabled()) {
    return { ok: false, message: 'CICERON_GOOGLE_ENABLED off', events: [] }
  }

  const result = await listUpcomingGoogleCalendarEvents({
    firmId: persona.firmId,
    actorId: persona.id,
  })
  if (!result.ok) {
    return { ok: false, message: result.reason, events: [] }
  }
  return {
    ok: true,
    message:
      result.events.length === 0
        ? 'Sin eventos próximos en el calendario principal.'
        : `${result.events.length} evento(s) próximos.`,
    events: result.events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
    })),
  }
}
