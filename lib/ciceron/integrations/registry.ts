import { createGoogleWorkspaceProvider } from './google-provider'
import { createMicrosoft365Provider } from './microsoft-provider'
import type { WorkspaceProvider, WorkspaceProviderId } from './types'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

export function getWorkspaceProvider(
  id: WorkspaceProviderId
): WorkspaceProvider {
  if (id === 'google_workspace') return createGoogleWorkspaceProvider()
  return createMicrosoft365Provider()
}

export async function loadPreferredWorkspaceProvider(
  persona: DemoPersona
): Promise<WorkspaceProviderId> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return 'microsoft365'
  const { data } = await db
    .from('workspace_provider_settings')
    .select('preferred_provider')
    .eq('firm_id', persona.firmId)
    .limit(1)
  const row = (Array.isArray(data) ? data[0] : null) as {
    preferred_provider?: string
  } | null
  if (row?.preferred_provider === 'google_workspace') return 'google_workspace'
  return 'microsoft365'
}

export async function savePreferredWorkspaceProvider(opts: {
  persona: DemoPersona
  provider: WorkspaceProviderId
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    opts.persona.role !== 'socio' &&
    opts.persona.role !== 'admin' &&
    opts.persona.role !== 'asociado'
  ) {
    return { ok: false, error: 'forbidden' }
  }
  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, error: 'db' }
  const { error } = await db.from('workspace_provider_settings').upsert(
    {
      firm_id: opts.persona.firmId,
      preferred_provider: opts.provider,
      updated_by_actor: opts.persona.id,
      is_demo: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'firm_id' }
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
