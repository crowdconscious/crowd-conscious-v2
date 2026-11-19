import 'server-only'

import { CICERON_DEMO_LABEL, CICERON_BASE } from '@/lib/ciceron/config'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import {
  recordAuditEvent,
  type AuditInsertClient,
} from '@/lib/ciceron/audit/write'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import { loadHoyBriefing } from '@/lib/ciceron/demo/monitor-data'
import { loadDeadlines } from '@/lib/ciceron/demo/data'
import { countDeadlinesInCurrentWeek } from '@/lib/ciceron/deadlines/week-window-pure'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'
import {
  canSendDemoLiveTest,
  readDemoRecipientWhatsApp,
} from '@/lib/ciceron/engagement/demo-recipient'
import {
  buildWhatsAppTemplateVariableList,
  readWhatsAppCloudConfig,
  sendMorningSummaryWhatsApp,
} from './cloud-api'

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  )
}

/**
 * Live demo test: send the approved morning WhatsApp template for the
 * demo firm to CICERON_DEMO_RECIPIENT_WHATSAPP.
 */
export async function sendDemoMorningWhatsAppTest(opts: {
  persona: DemoPersona
}): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const cfg = readWhatsAppCloudConfig()
  if (!cfg.enabled) {
    return { ok: false, error: 'CICERON_WHATSAPP_ENABLED off' }
  }
  if (opts.persona.firmId !== CICERON_SEED.firmDemo) {
    return { ok: false, error: 'demo_firm_only' }
  }
  if (!canSendDemoLiveTest(opts.persona.role)) {
    return { ok: false, error: 'forbidden' }
  }

  const to = readDemoRecipientWhatsApp()
  if (!to) {
    return {
      ok: false,
      error: 'CICERON_DEMO_RECIPIENT_WHATSAPP missing or invalid',
    }
  }

  const [briefing, { deadlines }] = await Promise.all([
    loadHoyBriefing(opts.persona),
    loadDeadlines(opts.persona),
  ])

  let asuntosConNovedad = 0
  for (const items of briefing.byClient.values()) {
    asuntosConNovedad += items.length
  }
  const plazosEstaSemana = countDeadlinesInCurrentWeek(
    deadlines.map((d) => d.dueAt)
  )
  const dateLabel = formatDateLongEs(new Date().toISOString())
  const hoyUrl = `${appBaseUrl()}${CICERON_BASE}/hoy`

  const templateVariables = buildWhatsAppTemplateVariableList({
    dateLabel,
    asuntosConNovedad,
    plazosEstaSemana,
    hoyUrl,
  })

  const result = await sendMorningSummaryWhatsApp({
    toE164Digits: to,
    templateVariables,
  })

  if (!result.ok) {
    return { ok: false, error: result.reason }
  }
  if (result.mode === 'skipped') {
    return { ok: false, error: result.reason }
  }

  const db = tryCreateCiceronAdminClient()
  if (db) {
    await recordAuditEvent(db as unknown as AuditInsertClient, {
      firmId: opts.persona.firmId,
      userId: opts.persona.id,
      action: 'morning_whatsapp_demo_test',
      entityType: 'whatsapp_morning_summary',
      payload: {
        channel: 'whatsapp',
        labelled: CICERON_DEMO_LABEL,
        messageId: result.messageId,
        asuntosConNovedad,
        plazosEstaSemana,
      },
    })
  }

  return { ok: true, to }
}
