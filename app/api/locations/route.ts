import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CC_SESSION = 'cc_session'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city') || undefined
    const category = searchParams.get('category') || undefined

    const supabase = await createClient()
    let q = supabase
      .from('conscious_locations')
      .select('*')
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })

    if (city) q = q.eq('city', city)
    if (category) q = q.eq('category', category)

    const { data: locations, error } = await q

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: cityRows } = await supabase
      .from('conscious_locations')
      .select('city')
      .eq('status', 'active')

    const citiesDistinct = [...new Set((cityRows ?? []).map((r) => r.city).filter(Boolean))].sort()

    const rows = locations ?? []
    const sorted = [...rows].sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      const as = a.conscious_score
      const bs = b.conscious_score
      if (as == null && bs == null) return 0
      if (as == null) return 1
      if (bs == null) return -1
      return Number(bs) - Number(as)
    })

    const marketIds = sorted.map((l) => l.current_market_id).filter(Boolean) as string[]

    const admin = createAdminClient()
    type OutcomeRow = {
      id: string
      market_id: string
      label: string
      probability: number
      vote_count: number
      total_confidence: number
      sort_order: number | null
    }

    const { data: outcomeRows } = marketIds.length
      ? await admin
          .from('market_outcomes')
          .select('id, market_id, label, probability, vote_count, total_confidence, sort_order')
          .in('market_id', marketIds)
      : { data: [] as OutcomeRow[] }

    const outcomesByMarket = new Map<string, OutcomeRow[]>()
    for (const o of outcomeRows ?? []) {
      const mid = o.market_id
      if (!outcomesByMarket.has(mid)) outcomesByMarket.set(mid, [])
      outcomesByMarket.get(mid)!.push(o)
    }
    for (const arr of outcomesByMarket.values()) {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }

    const user = await getCurrentUser()
    const cookieStore = await cookies()
    const hasVotedByMarket = new Map<string, boolean>()

    if (marketIds.length) {
      if (user?.id) {
        const { data: votes } = await admin
          .from('market_votes')
          .select('market_id')
          .eq('user_id', user.id)
          .in('market_id', marketIds)
        for (const v of votes ?? []) {
          hasVotedByMarket.set(v.market_id, true)
        }
      } else {
        const sessionId = cookieStore.get(CC_SESSION)?.value
        if (sessionId && UUID_REGEX.test(sessionId)) {
          const { data: participant } = await admin
            .from('anonymous_participants')
            .select('id')
            .eq('session_id', sessionId)
            .is('converted_to_user_id', null)
            .maybeSingle()
          if (participant?.id) {
            const { data: votes } = await admin
              .from('market_votes')
              .select('market_id')
              .eq('anonymous_participant_id', participant.id)
              .in('market_id', marketIds)
            for (const v of votes ?? []) {
              hasVotedByMarket.set(v.market_id, true)
            }
          }
        }
      }
    }

    const payload = sorted.map((loc) => ({
      ...loc,
      outcomes: loc.current_market_id ? outcomesByMarket.get(loc.current_market_id) ?? [] : [],
      hasVoted: loc.current_market_id ? hasVotedByMarket.get(loc.current_market_id) ?? false : false,
    }))

    return NextResponse.json({ locations: payload, cities: citiesDistinct })
  } catch (err) {
    console.error('[GET /api/locations]', err)
    return NextResponse.json({ error: 'Failed to load locations' }, { status: 500 })
  }
}
