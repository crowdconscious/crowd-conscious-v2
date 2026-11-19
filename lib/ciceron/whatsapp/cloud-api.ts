/**
 * WhatsApp Business Cloud API — morning summary template send.
 *
 * Gated by CICERON_WHATSAPP_ENABLED (default off). Requires an approved
 * Meta template whose body variables are (in order):
 *   {{1}} date label
 *   {{2}} count of asuntos con novedad
 *   {{3}} plazos esta semana
 *   {{4}} link to Hoy
 *
 * Owner setup (Meta) — see PR description for exact Spanish template text:
 * 1. Meta Business + WhatsApp Business Account
 * 2. Cloud API app; Phone Number ID + permanent token
 * 3. Submit / approve the morning summary template (es_MX)
 * 4. Env (never commit secrets):
 *    - CICERON_WHATSAPP_ENABLED=true
 *    - CICERON_WHATSAPP_PHONE_NUMBER_ID=
 *    - CICERON_WHATSAPP_ACCESS_TOKEN=
 *    - CICERON_WHATSAPP_TEMPLATE_NAME=ciceron_resumen_manana
 *    - CICERON_WHATSAPP_TEMPLATE_LANG=es_MX
 *    - CICERON_DEMO_RECIPIENT_WHATSAPP= (E.164 for live demo test)
 */

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

export type WhatsAppTemplateVariables = {
  dateLabel: string
  asuntosConNovedad: number
  plazosEstaSemana: number
  hoyUrl: string
}

export function buildWhatsAppTemplateVariableList(
  vars: WhatsAppTemplateVariables
): string[] {
  return [
    vars.dateLabel,
    String(vars.asuntosConNovedad),
    String(vars.plazosEstaSemana),
    vars.hoyUrl,
  ]
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
  if (input.templateVariables.length < 4) {
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
      components: [
        {
          type: 'body',
          parameters: input.templateVariables.map((text) => ({
            type: 'text',
            text,
          })),
        },
      ],
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
