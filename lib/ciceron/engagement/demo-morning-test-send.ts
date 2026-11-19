import 'server-only'

import { sendEmail } from '@/lib/resend'
import { CICERON_DEMO_LABEL } from '@/lib/ciceron/config'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import {
  recordAuditEvent,
  type AuditInsertClient,
} from '@/lib/ciceron/audit/write'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { buildMorningEmailForPersona } from './morning-email-data'
import { isMorningEmailEnabled } from './morning-email-gate'
import {
  canSendDemoLiveTest,
  readDemoRecipientEmail,
} from './demo-recipient'

/**
 * Live demo test: send the morning summary for the demo firm to
 * CICERON_DEMO_RECIPIENT_EMAIL. Cron path unchanged.
 */
export async function sendDemoMorningSummaryTest(opts: {
  persona: DemoPersona
}): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  if (!isMorningEmailEnabled()) {
    return { ok: false, error: 'CICERON_MORNING_EMAIL_ENABLED off' }
  }
  if (opts.persona.firmId !== CICERON_SEED.firmDemo) {
    return { ok: false, error: 'demo_firm_only' }
  }
  if (!canSendDemoLiveTest(opts.persona.role)) {
    return { ok: false, error: 'forbidden' }
  }

  const to = readDemoRecipientEmail()
  if (!to) {
    return { ok: false, error: 'CICERON_DEMO_RECIPIENT_EMAIL missing or invalid' }
  }

  const { payload, html } = await buildMorningEmailForPersona(opts.persona, {
    includeNovedades: true,
    includePlazos: true,
    includeAssignments: true,
  })

  const demoBanner = `<p style="font-family:system-ui,sans-serif;font-size:12px;color:#0B1F33;background:#E8F5EF;padding:10px 12px;border-radius:4px;margin:0 0 16px"><strong>${CICERON_DEMO_LABEL}.</strong> Resumen de prueba del despacho demo — datos ficticios.</p>`
  const htmlWithBanner = html.replace(
    /(<p style="font-family:system-ui,sans-serif;font-size:16px;color:#0B1F33;margin:0 0 8px">)/,
    `${demoBanner}$1`
  )

  const result = await sendEmail(to, {
    subject: `[Prueba · ${CICERON_DEMO_LABEL}] ${payload.subject}`,
    html: htmlWithBanner,
  })
  if (!result.success) {
    return { ok: false, error: result.error ?? 'send_failed' }
  }

  const db = tryCreateCiceronAdminClient()
  if (db) {
    // Admin schema client is thenable; AuditInsertClient expects Promise.
    await recordAuditEvent(db as unknown as AuditInsertClient, {
      firmId: opts.persona.firmId,
      userId: opts.persona.id,
      action: 'morning_email_demo_test',
      entityType: 'morning_email_preferences',
      payload: { channel: 'email', labelled: CICERON_DEMO_LABEL },
    })
  }

  return { ok: true, to }
}
