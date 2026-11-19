'use server'

import { revalidatePath } from 'next/cache'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { isGoogleWorkspaceEnabled } from './google-gate'
import {
  writeGoogleCookieStatus,
  buildGoogleOAuthAuthorizeUrl,
} from './google-provider'
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

export async function disconnectGoogleSimAction(): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  await writeGoogleCookieStatus('disconnected')
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

/** Returns authorize URL when OAuth env is configured; otherwise null (use sim). */
export async function getGoogleAuthorizeUrlAction(): Promise<string | null> {
  const persona = await getCiceronDemoSession()
  if (!persona) return null
  return buildGoogleOAuthAuthorizeUrl(`firm:${persona.firmId}:actor:${persona.id}`)
}
