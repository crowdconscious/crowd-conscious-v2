import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

export type ClientNeedNoteView = {
  id: string
  firmId: string
  firmName: string | null
  context: string
  body: string
  status: 'nuevo' | 'leido'
  createdAt: string
  authorActor: string
  isDemo: boolean
}

export async function loadClientNeedNotesInbox(
  persona: DemoPersona
): Promise<{ rows: ClientNeedNoteView[]; source: 'schema' | 'empty' }> {
  if (persona.role !== 'admin') return { rows: [], source: 'empty' }

  const db = tryCreateCiceronAdminClient()
  if (!db) return { rows: [], source: 'empty' }

  const { data, error } = await db
    .from('client_need_notes')
    .select('id, firm_id, author_actor, context, body, status, is_demo, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return { rows: [], source: 'empty' }

  const firmIds = [...new Set((data as Array<{ firm_id: string }>).map((r) => r.firm_id))]
  const firmNames = new Map<string, string>()
  if (firmIds.length > 0) {
    const { data: firms } = await db.from('firms').select('id, name').in('id', firmIds)
    for (const f of (firms as Array<{ id: string; name: string }> | null) ?? []) {
      firmNames.set(f.id, f.name)
    }
  }

  const rows: ClientNeedNoteView[] = (data as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    firmId: String(r.firm_id),
    firmName: firmNames.get(String(r.firm_id)) ?? null,
    context: String(r.context),
    body: String(r.body),
    status: r.status === 'leido' ? 'leido' : 'nuevo',
    createdAt: String(r.created_at),
    authorActor: String(r.author_actor),
    isDemo: Boolean(r.is_demo),
  }))

  return { rows, source: 'schema' }
}
