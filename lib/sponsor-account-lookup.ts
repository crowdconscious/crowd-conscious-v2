/**
 * Shared: given a logged-in user, find the sponsor_accounts they own or
 * have email access to.
 *
 * Returns the smallest payload both the AppLayout sidebar and the
 * PredictionsShell / landing banner need:
 *   - count: total rows matching (either link)
 *   - primary: a single representative row if count >= 1, with the
 *     fields needed to deep-link into /dashboard/sponsor/[token] OR
 *     show a branded card (company name, logo)
 *
 * Implementation notes (learn-from-last-bug):
 *   - Uses supabase-js typed `.eq()` / `.ilike()` split across two
 *     queries instead of PostgREST `.or()` filter-string. `.or()` reserves
 *     `.` as a column/op/value delimiter, so every email TLD (`.mx`,
 *     `.com`, …) silently mis-parsed and a user with a coupon-linked
 *     sponsor row saw zero hits. See commit 68a842f.
 *   - Uses the admin client intentionally: these are count + "what's the
 *     primary?" queries on indexed columns (`user_id`, `contact_email`),
 *     and we want the same one-trip pattern used elsewhere in the authed
 *     shell instead of round-tripping JWT-email claims.
 */

import { createAdminClient } from './supabase-admin'

export type SponsorAccountSummary = {
  id: string
  access_token: string | null
  company_name: string | null
  logo_url: string | null
  tier: string | null
  is_pulse_client: boolean | null
  contact_email: string | null
}

export type SponsorLookupResult = {
  count: number
  primary: SponsorAccountSummary | null
}

const EMPTY: SponsorLookupResult = { count: 0, primary: null }

export async function lookupSponsorAccountsForUser(
  user: { id: string; email?: string | null } | null | undefined
): Promise<SponsorLookupResult> {
  if (!user?.id) return EMPTY

  try {
    const admin = createAdminClient()
    const userEmail = (user.email ?? '').toLowerCase().trim()
    const selectCols =
      'id, access_token, company_name, logo_url, tier, is_pulse_client, contact_email, created_at, status'

    // Two parallel indexed queries; merge + dedupe client-side. Both
    // are filtered on `status = active` so archived / deleted sponsor
    // rows never surface in the UI sidebar.
    const [byIdRes, byEmailRes] = await Promise.all([
      admin
        .from('sponsor_accounts')
        .select(selectCols)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10),
      userEmail
        ? admin
            .from('sponsor_accounts')
            .select(selectCols)
            .ilike('contact_email', userEmail)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(10)
        : Promise.resolve({
            data: [] as SponsorAccountSummary[],
            error: null,
          }),
    ])

    type Row = SponsorAccountSummary & { created_at?: string | null; status?: string | null }
    const merged = new Map<string, Row>()
    for (const row of ((byIdRes.data ?? []) as Row[])) merged.set(row.id, row)
    for (const row of ((byEmailRes.data ?? []) as Row[])) {
      if (!merged.has(row.id)) merged.set(row.id, row)
    }
    const rows = Array.from(merged.values())

    if (rows.length === 0) return EMPTY

    // Prefer the most recently created; ties broken by the map insertion
    // order. A more sophisticated rank (e.g. prefer Pulse-active accounts)
    // can slot in here later without touching callers.
    const primary = rows[0]
    return {
      count: rows.length,
      primary: {
        id: primary.id,
        access_token: primary.access_token,
        company_name: primary.company_name,
        logo_url: primary.logo_url,
        tier: primary.tier,
        is_pulse_client: primary.is_pulse_client,
        contact_email: primary.contact_email,
      },
    }
  } catch (err) {
    console.warn('[sponsor-account-lookup] failed:', err)
    return EMPTY
  }
}
