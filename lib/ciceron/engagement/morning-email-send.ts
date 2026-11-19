import 'server-only'

import { sendEmail } from '@/lib/resend'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import {
  offlinePersonaById,
  type DemoPersona,
} from '@/lib/ciceron/demo/personas'
import {
  buildMorningEmailForPersona,
  isSafeDemoRecipient,
  listOptedInMorningPrefs,
  type MorningEmailPrefs,
} from './morning-email-data'
import { isMorningEmailEnabled } from './morning-email-gate'

async function personaForPrefs(prefs: MorningEmailPrefs): Promise<DemoPersona | null> {
  const offline = offlinePersonaById(prefs.actorId)
  if (offline) {
    return { ...offline, firmId: prefs.firmId }
  }
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  const { data } = await db
    .from('demo_personas')
    .select('id, firm_id, role, display_name')
    .eq('id', prefs.actorId)
    .limit(1)
  const row = (Array.isArray(data) ? data[0] : null) as {
    id: string
    firm_id: string
    role: DemoPersona['role']
    display_name: string
  } | null
  if (!row) return null
  return {
    id: row.id,
    firmId: row.firm_id,
    role: row.role,
    displayName: row.display_name,
    inviteCode: '',
    firmName: 'Despacho',
    firmSlug: 'despacho',
  }
}

export async function sendMorningEmailPreview(opts: {
  persona: DemoPersona
  prefs: MorningEmailPrefs
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSafeDemoRecipient({
    firmId: opts.persona.firmId,
    recipientEmail: opts.prefs.email,
    prefsEmail: opts.prefs.email,
  })) {
    return { ok: false, error: 'demo_recipient' }
  }

  const { payload, html } = await buildMorningEmailForPersona(
    opts.persona,
    opts.prefs
  )
  const result = await sendEmail(opts.prefs.email, {
    subject: `[Vista previa] ${payload.subject}`,
    html,
  })
  if (!result.success) {
    return { ok: false, error: result.error ?? 'send_failed' }
  }

  const db = tryCreateCiceronAdminClient()
  if (db) {
    await db
      .from('morning_email_preferences')
      .update({ last_preview_at: new Date().toISOString() })
      .eq('firm_id', opts.persona.firmId)
      .eq('actor_id', opts.persona.id)
  }
  return { ok: true }
}

export type MorningCronSummary = {
  enabled: boolean
  considered: number
  sent: number
  skipped: number
  failed: number
  errors: string[]
}

export async function runMorningEmailCron(): Promise<MorningCronSummary> {
  if (!isMorningEmailEnabled()) {
    return {
      enabled: false,
      considered: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    }
  }

  const prefsList = await listOptedInMorningPrefs()
  const summary: MorningCronSummary = {
    enabled: true,
    considered: prefsList.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  const db = tryCreateCiceronAdminClient()

  for (const prefs of prefsList) {
    if (
      prefs.firmId === CICERON_SEED.firmDemo &&
      !isSafeDemoRecipient({
        firmId: prefs.firmId,
        recipientEmail: prefs.email,
        prefsEmail: prefs.email,
      })
    ) {
      summary.skipped += 1
      continue
    }

    const persona = await personaForPrefs(prefs)
    if (!persona) {
      summary.skipped += 1
      continue
    }

    try {
      const { payload, html } = await buildMorningEmailForPersona(persona, prefs)
      const result = await sendEmail(prefs.email, {
        subject: payload.subject,
        html,
        headers: {
          'List-Unsubscribe': `<${payload.unsubscribeUrl}>`,
        },
      })
      if (!result.success) {
        summary.failed += 1
        summary.errors.push(result.error ?? 'send_failed')
        continue
      }
      summary.sent += 1
      if (db) {
        await db
          .from('morning_email_preferences')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', prefs.id)
      }
    } catch (e) {
      summary.failed += 1
      summary.errors.push(e instanceof Error ? e.message : 'unknown')
    }
  }

  return summary
}
