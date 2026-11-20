/**
 * WhatsApp Business Cloud API — morning summary template send.
 *
 * Gated by CICERON_WHATSAPP_ENABLED (default off).
 *
 * Template versions (selected by CICERON_WHATSAPP_TEMPLATE_NAME):
 * - v1 `ciceron_resumen_manana` — 4 body vars: date, asuntos, plazos semana, hoy URL
 * - v2 `ciceron_resumen_manana_v2` — 5 body vars + URL button suffix `hoy`
 *
 * Owner setup (Meta) — see PR description for exact Spanish template text:
 * 1. Meta Business + WhatsApp Business Account
 * 2. Cloud API app; Phone Number ID + permanent token
 * 3. Submit / approve the morning summary template (es_MX)
 * 4. Env (never commit secrets):
 *    - CICERON_WHATSAPP_ENABLED=true
 *    - CICERON_WHATSAPP_PHONE_NUMBER_ID=
 *    - CICERON_WHATSAPP_ACCESS_TOKEN=
 *    - CICERON_WHATSAPP_TEMPLATE_NAME=ciceron_resumen_manana (or _v2 after Meta approval)
 *    - CICERON_WHATSAPP_TEMPLATE_LANG=es_MX
 *    - CICERON_DEMO_RECIPIENT_WHATSAPP= (E.164 for live demo test)
 */

import { weekdayNameEsFromIso } from '@/lib/ciceron/demo/hoy-daily-line-pure'

export type WhatsAppCloudConfig = {
  enabled: boolean
  phoneNumberId: string | null
  accessToken: string | null
  templateName: string | null
  templateLang: string
}

export function readWhatsAppCloudConfig(
  env: Record<string, string | undefined> = process.env
): WhatsAppCloudConfig {
  const raw = env.CICERON_WHATSAPP_ENABLED?.trim().toLowerCase()
  const enabled = raw === '1' || raw === 'true' || raw === 'yes'
  return {
    enabled,
    phoneNumberId: env.CICERON_WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    accessToken: env.CICERON_WHATSAPP_ACCESS_TOKEN?.trim() || null,
    templateName: env.CICERON_WHATSAPP_TEMPLATE_NAME?.trim() || null,
    templateLang: env.CICERON_WHATSAPP_TEMPLATE_LANG?.trim() || 'es_MX',
  }
}

/** Suggested Meta template name (must match approved template). */
export const CICERON_WHATSAPP_TEMPLATE_SUGGESTED_NAME = 'ciceron_resumen_manana'
export const CICERON_WHATSAPP_TEMPLATE_V1_NAME = 'ciceron_resumen_manana'
export const CICERON_WHATSAPP_TEMPLATE_V2_NAME = 'ciceron_resumen_manana_v2'

/**
 * Exact Spanish body text to submit to Meta (4 body variables).
 * Keep in sync with sendMorningSummaryWhatsApp parameter order.
 */
export const CICERON_WHATSAPP_TEMPLATE_BODY_ES = [
  'Resumen Cicerón del {{1}}.',
  '',
  'Asuntos con novedad: {{2}}',
  'Plazos esta semana: {{3}}',
  '',
  'Abra Hoy: {{4}}',
  '',
  'Datos de demostración.',
].join('\n')

/** Exact Spanish body for Meta template ciceron_resumen_manana_v2 (5 body vars). */
export const CICERON_WHATSAPP_TEMPLATE_BODY_ES_V2 = [
  'Resumen Cicerón del {{1}}.',
  '',
  'Asuntos con novedad: {{2}}',
  'Pendientes por aprobar: {{3}}',
  'Próximo plazo: {{4}}',
  '',
  'Lo más relevante de hoy: {{5}}',
  '',
  'Datos de demostración.',
].join('\n')

export function isMorningWhatsAppTemplateV2(
  templateName: string | null | undefined
): boolean {
  return (templateName ?? '').trim() === CICERON_WHATSAPP_TEMPLATE_V2_NAME
}

const MONTHS_LONG_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/**
 * WhatsApp template params may not contain newlines/tabs or 4+ consecutive spaces.
 * Always returns a non-empty string.
 */
export function sanitizeWhatsAppTemplateParam(
  raw: string,
  fallback: string
): string {
  const cleaned = raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {4,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 0 ? cleaned : fallback
}

const HEADLINE_MAX = 90
const HEADLINE_FALLBACK = 'Sin novedades relevantes'
const DEADLINE_FALLBACK = 'Sin plazos próximos'

export function pickTopHeadlineWhatsAppParam(
  headlines: Array<string | null | undefined>
): string {
  for (const h of headlines) {
    if (!h) continue
    const oneLine = sanitizeWhatsAppTemplateParam(h, '')
    if (!oneLine) continue
    return oneLine.length > HEADLINE_MAX
      ? oneLine.slice(0, HEADLINE_MAX).trimEnd()
      : oneLine
  }
  return HEADLINE_FALLBACK
}

export function formatNextDeadlineWhatsAppParam(
  deadline: { label: string; dueAt?: string } | null
): string {
  if (!deadline?.dueAt) return DEADLINE_FALLBACK
  const dayIso = deadline.dueAt.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayIso)) return DEADLINE_FALLBACK
  const [y, m, d] = dayIso.split('-').map(Number)
  if (!y || !m || !d) return DEADLINE_FALLBACK
  const weekday = weekdayNameEsFromIso(deadline.dueAt)
  const month = MONTHS_LONG_ES[m - 1]
  if (!month) return DEADLINE_FALLBACK
  const label = sanitizeWhatsAppTemplateParam(deadline.label, 'Plazo')
  return sanitizeWhatsAppTemplateParam(
    `${label}, ${weekday} ${d} de ${month}`,
    DEADLINE_FALLBACK
  )
}

/** Mask E.164 digits for UI (e.g. ••••0458). Never shows full number. */
export function maskWhatsAppRecipient(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length < 4) return '••••'
  return `••••${d.slice(-4)}`
}

export type WhatsAppTemplateVariables = {
  dateLabel: string
  asuntosConNovedad: number
  plazosEstaSemana: number
  hoyUrl: string
}

export type WhatsAppTemplateVariablesV2 = {
  dateLabel: string
  asuntosConNovedad: number
  pendientesPorAprobar: number
  proximoPlazo: string
  loMasRelevante: string
}

export function buildWhatsAppTemplateVariableList(
  vars: WhatsAppTemplateVariables
): string[] {
  return [
    sanitizeWhatsAppTemplateParam(vars.dateLabel, 'Hoy'),
    String(vars.asuntosConNovedad),
    String(vars.plazosEstaSemana),
    sanitizeWhatsAppTemplateParam(vars.hoyUrl, 'hoy'),
  ]
}

export function buildWhatsAppTemplateVariableListV2(
  vars: WhatsAppTemplateVariablesV2
): string[] {
  return [
    sanitizeWhatsAppTemplateParam(vars.dateLabel, 'Hoy'),
    String(vars.asuntosConNovedad),
    String(vars.pendientesPorAprobar),
    sanitizeWhatsAppTemplateParam(vars.proximoPlazo, DEADLINE_FALLBACK),
    sanitizeWhatsAppTemplateParam(vars.loMasRelevante, HEADLINE_FALLBACK),
  ]
}

export type WhatsAppTemplateComponent = {
  type: 'body' | 'button'
  sub_type?: 'url'
  index?: string
  parameters?: Array<{ type: 'text'; text: string }>
}

export function buildMorningWhatsAppTemplateComponents(input: {
  templateName: string | null | undefined
  bodyVariables: string[]
}): WhatsAppTemplateComponent[] {
  const isV2 = isMorningWhatsAppTemplateV2(input.templateName)
  const count = isV2 ? 5 : 4
  const bodyParams = input.bodyVariables
    .slice(0, count)
    .map((text) => ({
      type: 'text' as const,
      text: sanitizeWhatsAppTemplateParam(text, '—'),
    }))

  const components: WhatsAppTemplateComponent[] = [
    { type: 'body', parameters: bodyParams },
  ]

  if (isV2) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: 'hoy' }],
    })
  }

  return components
}

export type WhatsAppMorningSendResult =
  | { ok: true; mode: 'sent'; messageId: string }
  | { ok: true; mode: 'skipped'; reason: string }
  | { ok: false; reason: string }

type GraphMessagesResponse = {
  messages?: Array<{ id?: string }>
  error?: { message?: string; code?: number }
}

/**
 * Sends an approved template via WhatsApp Cloud API (Graph).
 * No-ops (skipped) when the flag is off or credentials are incomplete.
 */
export async function sendMorningSummaryWhatsApp(input: {
  toE164Digits: string
  templateVariables: string[]
  fetchImpl?: typeof fetch
}): Promise<WhatsAppMorningSendResult> {
  const cfg = readWhatsAppCloudConfig()
  if (!cfg.enabled) {
    return { ok: true, mode: 'skipped', reason: 'CICERON_WHATSAPP_ENABLED off' }
  }
  if (!cfg.phoneNumberId || !cfg.accessToken || !cfg.templateName) {
    return {
      ok: true,
      mode: 'skipped',
      reason: 'missing WhatsApp Cloud API env placeholders',
    }
  }
  if (!/^\d{10,15}$/.test(input.toE164Digits)) {
    return { ok: false, reason: 'invalid_recipient' }
  }

  const isV2 = isMorningWhatsAppTemplateV2(cfg.templateName)
  const minVars = isV2 ? 5 : 4
  if (input.templateVariables.length < minVars) {
    return { ok: false, reason: 'template_variables_incomplete' }
  }

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(cfg.phoneNumberId)}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to: input.toE164Digits,
    type: 'template',
    template: {
      name: cfg.templateName,
      language: { code: cfg.templateLang },
      components: buildMorningWhatsAppTemplateComponents({
        templateName: cfg.templateName,
        bodyVariables: input.templateVariables,
      }),
    },
  }

  const fetchFn = input.fetchImpl ?? fetch
  let res: Response
  try {
    res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'network_error',
    }
  }

  let json: GraphMessagesResponse = {}
  try {
    json = (await res.json()) as GraphMessagesResponse
  } catch {
    json = {}
  }

  if (!res.ok) {
    return {
      ok: false,
      reason: json.error?.message ?? `http_${res.status}`,
    }
  }

  const messageId = json.messages?.[0]?.id
  if (!messageId) {
    return { ok: false, reason: 'missing_message_id' }
  }
  return { ok: true, mode: 'sent', messageId }
}

/** @deprecated Use sendMorningSummaryWhatsApp — kept for older call sites. */
export async function sendMorningSummaryWhatsAppScaffold(input: {
  toE164Digits: string
  templateVariables: string[]
}): Promise<WhatsAppMorningSendResult> {
  return sendMorningSummaryWhatsApp(input)
}
