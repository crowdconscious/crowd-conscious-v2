import type { SupabaseClient } from '@supabase/supabase-js'

export type SponsorAccountRow = {
  id: string
  company_name: string
  contact_email: string
}

type MarketLinkRow = {
  id: string
  title: string
  status: string
  total_votes: number | null
  resolution_date: string
  is_pulse: boolean
  is_draft?: boolean | null
  current_probability: number
  cover_image_url?: string | null
  translations?: unknown
  created_at?: string
  sponsor_account_id?: string | null
  sponsor_name?: string | null
  pulse_client_email?: string | null
  market_outcomes: unknown
}

const marketSelect = `
  id,
  title,
  status,
  total_votes,
  resolution_date,
  is_pulse,
  is_draft,
  current_probability,
  cover_image_url,
  translations,
  created_at,
  sponsor_account_id,
  sponsor_name,
  pulse_client_email,
  market_outcomes(id, label, probability, vote_count)
`

/** True if this market should appear on the sponsor dashboard for this account. */
export function marketBelongsToSponsorAccount(
  market: {
    sponsor_account_id?: string | null
    sponsor_name?: string | null
    pulse_client_email?: string | null
  },
  account: SponsorAccountRow
): boolean {
  if (market.sponsor_account_id && market.sponsor_account_id === account.id) return true
  const cn = (market.sponsor_name ?? '').trim().toLowerCase()
  const an = account.company_name.trim().toLowerCase()
  if (cn && an && cn === an) return true
  const pe = (market.pulse_client_email ?? '').trim().toLowerCase()
  const ae = account.contact_email.trim().toLowerCase()
  if (pe && ae && pe === ae) return true
  return false
}

/**
 * Markets linked by sponsor_account_id, matching sponsor_name, or Pulse client email.
 * De-duplicated by id, newest first.
 */
export async function fetchMarketsForSponsorAccount(
  admin: SupabaseClient,
  account: SponsorAccountRow
): Promise<MarketLinkRow[]> {
  const [byAccount, byName, byPulseEmail] = await Promise.all([
    admin.from('prediction_markets').select(marketSelect).eq('sponsor_account_id', account.id),
    admin
      .from('prediction_markets')
      .select(marketSelect)
      .ilike('sponsor_name', account.company_name.trim()),
    account.contact_email?.trim()
      ? admin
          .from('prediction_markets')
          .select(marketSelect)
          .eq('is_pulse', true)
          .ilike('pulse_client_email', account.contact_email.trim())
      : Promise.resolve({ data: [] as MarketLinkRow[], error: null }),
  ])

  const map = new Map<string, MarketLinkRow>()
  for (const row of [...(byAccount.data ?? []), ...(byName.data ?? []), ...(byPulseEmail.data ?? [])] as MarketLinkRow[]) {
    if (!row?.id) continue
    map.set(row.id, row)
  }

  return [...map.values()].sort((a, b) => {
    const ta = new Date(a.created_at ?? 0).getTime()
    const tb = new Date(b.created_at ?? 0).getTime()
    return tb - ta
  })
}
