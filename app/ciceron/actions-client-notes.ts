'use server'

import { revalidatePath } from 'next/cache'
import { parseSubmitClientNeedNoteInput } from '@/lib/ciceron/client-notes/validation'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export type ClientNoteActionResult = {
  ok: boolean
  message?: string
  id?: string
}

export async function submitClientNeedNoteAction(input: {
  context?: string
  body?: string
}): Promise<ClientNoteActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión.' }

  const parsed = parseSubmitClientNeedNoteInput({
    context: input.context,
    body: input.body,
  })
  if (!parsed.ok) return { ok: false, message: parsed.message }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { ok: false, message: 'Sin conexión a datos. Intente de nuevo más tarde.' }
  }

  // p_is_demo is ignored by the RPC (firms.is_demo is authoritative).
  const { data, error } = await db.rpc('submit_client_need_note', {
    p_firm_id: persona.firmId,
    p_actor: persona.id,
    p_context: parsed.data.context,
    p_body: parsed.data.body,
    p_notify_admins: true,
  })

  if (error) {
    return { ok: false, message: 'No se pudo enviar la nota. Intente de nuevo.' }
  }

  const row = data as Record<string, unknown> | null
  if (row && row.ok === false) {
    return {
      ok: false,
      message: String(row.policy_reason ?? 'No se pudo enviar la nota.'),
    }
  }

  revalidatePath('/ciceron/admin/ventas')
  return { ok: true, id: row?.id ? String(row.id) : undefined }
}

export async function markClientNeedNoteReadAction(
  noteId: string
): Promise<ClientNoteActionResult> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión.' }
  if (persona.role !== 'admin') {
    return { ok: false, message: 'Solo administración puede marcar notas como leídas.' }
  }
  if (!noteId) return { ok: false, message: 'Falta el identificador.' }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { ok: false, message: 'Sin conexión a datos.' }
  }

  const { data, error } = await db.rpc('mark_client_need_note_read', {
    p_note_id: noteId,
    p_actor: persona.id,
  })
  if (error) {
    return { ok: false, message: 'No se pudo marcar la nota.' }
  }
  const row = data as Record<string, unknown> | null
  if (row && row.ok === false) {
    return { ok: false, message: String(row.policy_reason ?? 'Denegado.') }
  }

  revalidatePath('/ciceron/admin/ventas')
  return { ok: true }
}
