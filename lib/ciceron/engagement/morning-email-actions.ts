'use server'

import { revalidatePath } from 'next/cache'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { formatTimeEs } from '@/lib/ciceron/copy/format-date'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { maskWhatsAppRecipient } from '@/lib/ciceron/whatsapp/cloud-api'
import {
  loadMorningEmailPrefs,
  upsertMorningEmailPrefs,
} from './morning-email-data'
import { sendMorningEmailPreview } from './morning-email-send'
import { sendDemoMorningSummaryTest } from './demo-morning-test-send'
import { humanizeDemoTestError } from './demo-test-send-pure'
import { readDemoRecipientWhatsApp } from './demo-recipient'
import { sendDemoMorningWhatsAppTest } from '@/lib/ciceron/whatsapp/demo-whatsapp-test-send'

export type DemoTestActionState = {
  ok: boolean
  message: string
} | null

export { humanizeDemoTestError }

function sentAtMessage(): string {
  return copy.morningEmail.testSendOk(formatTimeEs(new Date()))
}

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

/** Admin/socio demo-only: send live summary to CICERON_DEMO_RECIPIENT_EMAIL. */
export async function sendDemoMorningTestAction(
  _prev: DemoTestActionState,
  _formData: FormData
): Promise<DemoTestActionState> {
  const persona = await getCiceronDemoSession()
  if (!persona) {
    return { ok: false, message: copy.morningEmail.sendDemoTestForbidden }
  }
  const result = await sendDemoMorningSummaryTest({ persona })
  revalidatePath('/ciceron/preferencias/correo')
  if (!result.ok) {
    return {
      ok: false,
      message: humanizeDemoTestError(result.error, 'email'),
    }
  }
  return { ok: true, message: sentAtMessage() }
}

/** Admin/socio demo-only: send live WhatsApp template to CICERON_DEMO_RECIPIENT_WHATSAPP. */
export async function sendDemoMorningWhatsAppTestAction(
  _prev: DemoTestActionState,
  _formData: FormData
): Promise<DemoTestActionState> {
  const persona = await getCiceronDemoSession()
  if (!persona) {
    return { ok: false, message: copy.morningEmail.sendDemoTestForbidden }
  }
  const result = await sendDemoMorningWhatsAppTest({ persona })
  revalidatePath('/ciceron/preferencias/correo')
  if (!result.ok) {
    const to = readDemoRecipientWhatsApp()
    const masked = to ? maskWhatsAppRecipient(to) : null
    return {
      ok: false,
      message: humanizeDemoTestError(result.error, 'whatsapp', masked),
    }
  }
  const masked = maskWhatsAppRecipient(result.to)
  return {
    ok: true,
    message: `${sentAtMessage()} (${masked})`,
  }
}
