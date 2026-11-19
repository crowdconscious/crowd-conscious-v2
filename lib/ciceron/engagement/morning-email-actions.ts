'use server'

import { revalidatePath } from 'next/cache'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import {
  loadMorningEmailPrefs,
  upsertMorningEmailPrefs,
} from './morning-email-data'
import { sendMorningEmailPreview } from './morning-email-send'

export async function saveMorningEmailPrefsAction(
  formData: FormData
): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const email = String(formData.get('email') ?? '').trim()
  const morningEnabled = formData.get('morningEnabled') === 'on'
  const includeNovedades = formData.get('includeNovedades') === 'on'
  const includePlazos = formData.get('includePlazos') === 'on'
  const includeAssignments = formData.get('includeAssignments') === 'on'

  await upsertMorningEmailPrefs({
    persona,
    email,
    morningEnabled,
    includeNovedades,
    includePlazos,
    includeAssignments,
  })

  revalidatePath('/ciceron/preferencias/correo')
}

export async function sendMorningPreviewAction(): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return
  const prefs = await loadMorningEmailPrefs(persona)
  if (!prefs?.email) return
  await sendMorningEmailPreview({ persona, prefs })
  revalidatePath('/ciceron/preferencias/correo')
}
