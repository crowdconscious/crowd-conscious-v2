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
  buildWhatsAppTemplateVariableListV2,
  formatNextDeadlineWhatsAppParam,
  isMorningWhatsAppTemplateV2,
  pickTopHeadlineWhatsAppParam,
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
    return { ok: false, error: 'whatsapp_disabled' }
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
      error: 'recipient_missing',
    }
  }

  const [briefing, { deadlines }] = await Promise.all([
    loadHoyBriefing(opts.persona),
    loadDeadlines(opts.persona),
  ])

  let asuntosConNovedad = 0
  const headlines: string[] = []
  for (const items of briefing.byClient.values()) {
    asuntosConNovedad += items.length
    for (const item of items) {
      if (item.title) headlines.push(item.title)
    }
  }
  const plazosEstaSemana = countDeadlinesInCurrentWeek(
    deadlines.map((d) => d.dueAt)
  )
  const dateLabel = formatDateLongEs(new Date().toISOString())
  const hoyUrl = `${appBaseUrl()}${CICERON_BASE}/hoy`

  const pendientesPorAprobar = briefing.reviews.length
  const nextDeadline = deadlines.find((d) => Boolean(d.dueAt)) ?? null
  const proximoPlazo = formatNextDeadlineWhatsAppParam(
    nextDeadline
      ? { label: nextDeadline.label, dueAt: nextDeadline.dueAt }
      : null
  )
  const loMasRelevante = pickTopHeadlineWhatsAppParam(headlines)

  const useV2 = isMorningWhatsAppTemplateV2(cfg.templateName)
  const templateVariables = useV2
    ? buildWhatsAppTemplateVariableListV2({
        dateLabel,
        asuntosConNovedad,
        pendientesPorAprobar,
        proximoPlazo,
        loMasRelevante,
      })
    : buildWhatsAppTemplateVariableList({
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
        templateVersion: useV2 ? 'v2' : 'v1',
        asuntosConNovedad,
        ...(useV2
          ? { pendientesPorAprobar, proximoPlazo }
          : { plazosEstaSemana }),
      },
    })
  }

  return { ok: true, to }
}
