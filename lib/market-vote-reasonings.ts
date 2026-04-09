import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { PulseFeaturedReasoning } from '@/components/pulse/PulseResultClient'

type Admin = SupabaseClient<Database>

type MarketVoteReasoningRow = Pick<
  Database['public']['Tables']['market_votes']['Row'],
  'id' | 'reasoning' | 'confidence' | 'outcome_id' | 'user_id' | 'anonymous_participant_id'
>

/**
 * Load vote rows with non-empty reasoning and resolve author display names.
 * Does not use PostgREST embeds on market_votes → profiles (FK was dropped for guest votes).
 */
export async function loadMarketVoteReasoningsWithAuthors(
  admin: Admin,
  marketId: string,
  locale: 'es' | 'en'
): Promise<PulseFeaturedReasoning[]> {
  const { data, error } = await admin
    .from('market_votes')
    .select('id, reasoning, confidence, outcome_id, user_id, anonymous_participant_id')
    .eq('market_id', marketId)

  if (error) {
    console.error('[loadMarketVoteReasoningsWithAuthors]', error)
    return []
  }

  const rows = (data ?? []) as MarketVoteReasoningRow[]
  const withText = rows.filter((r) => (r.reasoning ?? '').trim() !== '')
  if (withText.length === 0) return []

  const userIds = [...new Set(withText.map((r) => r.user_id).filter((x): x is string => !!x))]
  const anonIds = [
    ...new Set(withText.map((r) => r.anonymous_participant_id).filter((x): x is string => !!x)),
  ]

  const [profRes, apRes] = await Promise.all([
    userIds.length > 0
      ? admin.from('profiles').select('id, full_name').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    anonIds.length > 0
      ? admin.from('anonymous_participants').select('id, alias').in('id', anonIds)
      : Promise.resolve({ data: [] as { id: string; alias: string | null }[] }),
  ])

  const profMap = new Map((profRes.data ?? []).map((p) => [p.id, p.full_name]))
  const apMap = new Map((apRes.data ?? []).map((a) => [a.id, a.alias]))

  const fallback = locale === 'es' ? 'Invitado' : 'Guest'

  return withText
    .map((r) => {
      const text = r.reasoning!.trim()
      let author_name = fallback
      if (r.anonymous_participant_id) {
        const a = apMap.get(r.anonymous_participant_id)
        if (a?.trim()) author_name = a.trim()
      } else if (r.user_id) {
        const n = profMap.get(r.user_id)
        if (n?.trim()) author_name = n.trim()
      }
      return {
        id: r.id,
        reasoning: text,
        confidence: typeof r.confidence === 'number' ? r.confidence : 0,
        outcome_id: r.outcome_id,
        author_name,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
}
