import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Addresses that hard-bounced or filed a spam complaint (written by the
 * Resend webhook, table public.email_suppressions). Bulk sends must skip them;
 * repeatedly mailing them is the fastest way to land in spam.
 */
export type SuppressionReason = 'hard_bounce' | 'complaint'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function loadSuppressedEmails(admin: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>()
  try {
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await admin
        .from('email_suppressions')
        .select('email')
        .range(from, from + pageSize - 1)
      if (error) {
        console.warn('[email-suppression] load failed; sending without suppression list:', error.message)
        break
      }
      for (const r of data ?? []) out.add(normalizeEmail(String(r.email)))
      if (!data || data.length < pageSize) break
    }
  } catch (e) {
    console.warn('[email-suppression] load threw', e)
  }
  return out
}

export async function suppressEmail(
  admin: SupabaseClient,
  email: string,
  reason: SuppressionReason,
  detail?: { eventId?: string; info?: string }
): Promise<void> {
  const norm = normalizeEmail(email)
  const { error } = await admin.from('email_suppressions').upsert(
    {
      email: norm,
      reason,
      last_event_id: detail?.eventId ?? null,
      detail: detail?.info ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  )
  if (error) throw new Error(error.message)
  // A complaint is an explicit "stop": also opt them out of marketing mail.
  if (reason === 'complaint') {
    await admin
      .from('newsletter_subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('email', norm)
    await admin.from('profiles').update({ email_notifications: false }).ilike('email', norm.replace(/[\\%_]/g, '\\$&'))
  }
}
