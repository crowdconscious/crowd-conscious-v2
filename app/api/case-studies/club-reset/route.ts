import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Live numbers for the Club Reset case study. Used by:
 *   - /pulse (ClubResetCaseStudyCard hero)
 *   - /blog/club-reset-18-personas (in-post stats)
 *   - any future shareable visual card
 *
 * Query strategy
 * --------------
 * Club Reset is a Conscious Location identified by slug. Its current voting
 * market is `conscious_locations.current_market_id`. We aggregate over that
 * market's `market_votes` to derive vote count, average confidence, anonymous
 * vs registered split, and outcome distribution.
 *
 * If the location or market hasn't been seeded yet, we fall back to the
 * conservative public stat the founder has cited so the public surfaces never
 * render blank.
 */

const FALLBACK = {
  slug: 'club-reset',
  name: 'Club Reset',
  votes: 18,
  avg_confidence: 9.2,
  registered_votes: 0,
  anonymous_votes: 0,
  outcomes: [] as Array<{ id: string; label: string; votes: number; pct: number }>,
  market_id: null as string | null,
  market_href: '/locations',
} as const

export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: location } = await admin
      .from('conscious_locations')
      .select('id, name, slug, current_market_id, total_votes, avg_confidence')
      .eq('slug', 'club-reset')
      .maybeSingle()

    if (!location || !location.current_market_id) {
      return NextResponse.json(FALLBACK, {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
      })
    }

    const marketId = location.current_market_id as string

    const [{ data: votes }, { data: outcomes }] = await Promise.all([
      admin
        .from('market_votes')
        .select('id, user_id, anonymous_participant_id, confidence, outcome_id')
        .eq('market_id', marketId),
      admin
        .from('market_outcomes')
        .select('id, label, label_en')
        .eq('market_id', marketId),
    ])

    const rows = votes ?? []
    const total = rows.length
    const registered = rows.filter((v) => v.user_id != null).length
    const anonymous = rows.filter((v) => v.anonymous_participant_id != null).length
    const confidenceSum = rows.reduce(
      (sum, v) => sum + Number((v as { confidence?: number }).confidence ?? 0),
      0
    )
    const avg = total > 0 ? confidenceSum / total : 0

    const outcomeCounts: Record<string, number> = {}
    for (const v of rows) {
      const id = (v as { outcome_id?: string }).outcome_id
      if (!id) continue
      outcomeCounts[id] = (outcomeCounts[id] ?? 0) + 1
    }
    const outcomeRows = (outcomes ?? []).map((o) => ({
      id: o.id as string,
      label: ((o as { label?: string }).label as string) || '—',
      votes: outcomeCounts[o.id] ?? 0,
      pct: total > 0 ? Math.round(((outcomeCounts[o.id] ?? 0) / total) * 100) : 0,
    }))

    return NextResponse.json(
      {
        slug: location.slug,
        name: location.name,
        votes: total || (location.total_votes ?? FALLBACK.votes),
        avg_confidence:
          total > 0 ? Math.round(avg * 10) / 10 : Number(location.avg_confidence ?? FALLBACK.avg_confidence),
        registered_votes: registered,
        anonymous_votes: anonymous,
        outcomes: outcomeRows,
        market_id: marketId,
        market_href: `/predictions/markets/${marketId}`,
      },
      {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
      }
    )
  } catch (err) {
    console.error('[case-studies/club-reset]', err)
    return NextResponse.json(FALLBACK, { status: 200 })
  }
}
