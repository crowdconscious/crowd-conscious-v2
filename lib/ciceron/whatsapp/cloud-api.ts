/**
 * WhatsApp Business Cloud API scaffold for morning summaries.
 *
 * Gated by CICERON_WHATSAPP_ENABLED (default off). Never sends while
 * credentials are missing or the flag is off.
 *
 * Owner setup (Meta):
 * 1. Create a Meta Business + WhatsApp Business Account
 * 2. Create a Cloud API app; copy Phone Number ID + permanent token
 * 3. Submit / approve a message template for the morning summary
 *    (utility / marketing category per Meta policy) before production sends
 * 4. Set env placeholders (do not commit secrets):
 *    - CICERON_WHATSAPP_ENABLED=true
 *    - CICERON_WHATSAPP_PHONE_NUMBER_ID=
 *    - CICERON_WHATSAPP_ACCESS_TOKEN=
 *    - CICERON_WHATSAPP_TEMPLATE_NAME= (approved template name)
 *    - CICERON_WHATSAPP_TEMPLATE_LANG=es_MX
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

export type WhatsAppMorningSendResult =
  | { ok: true; mode: 'skipped'; reason: string }
  | { ok: false; reason: string }

/**
 * Scaffold only: validates config and returns skipped.
 * No network calls. Wire Graph API after Meta template approval.
 */
export async function sendMorningSummaryWhatsAppScaffold(input: {
  toE164Digits: string
  templateVariables: string[]
}): Promise<WhatsAppMorningSendResult> {
  void input
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
  // Intentionally no fetch — credentials must never be exercised until
  // the owner confirms an approved template and turns the flag on in prod.
  return {
    ok: true,
    mode: 'skipped',
    reason: 'scaffold: template send not implemented until Meta approval',
  }
}
