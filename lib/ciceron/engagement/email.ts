/**
 * Demo email gate for briefing / weekly summary.
 * Real egress only if recipient ∈ firm_settings.email_allowlist (Prompt 7: empty).
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'

export async function getFirmEmailAllowlist(firmId: string): Promise<string[]> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return []
  const { data } = await db
    .from('firm_settings')
    .select('email_allowlist')
    .eq('firm_id', firmId)
    .limit(1)
  if (!Array.isArray(data) || !data[0]) return []
  const list = (data[0] as { email_allowlist: string[] | null }).email_allowlist
  return Array.isArray(list) ? list.filter(Boolean) : []
}

/** True only when allowlist is non-empty and recipient (if given) is listed. */
export async function isEmailAllowlisted(
  firmId: string,
  recipient: string | null
): Promise<boolean> {
  const list = await getFirmEmailAllowlist(firmId)
  if (!list.length) return false
  if (!recipient) return false
  return list.map((e) => e.toLowerCase()).includes(recipient.toLowerCase())
}
