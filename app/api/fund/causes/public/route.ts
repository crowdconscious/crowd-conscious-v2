import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Public list of verified, active causes for cross-surface rendering
 * (landing page, /locations row, /about section). Uses the admin client
 * deliberately — public read on fund_causes requires `active = true` and
 * we want the same defaults regardless of whether the caller is anon.
 *
 * Query params:
 *   city — optional ILIKE filter (case-insensitive) to scope to a local
 *          community row, e.g. /locations CDMX shows CDMX causes first.
 *   limit — capped at 12; the row UI itself never renders more than 4.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')?.trim() || null
    const limit = Math.min(12, Math.max(1, Number(searchParams.get('limit')) || 6))

    let query = admin
      .from('fund_causes')
      .select(
        'id, slug, name, organization, category, short_description, logo_url, cover_image_url, image_url, city, verified'
      )
      .eq('active', true)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (city) {
      query = query.ilike('city', city)
    }

    const { data, error } = await query
    if (error) {
      console.error('[api/fund/causes/public]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { causes: data ?? [] },
      {
        headers: {
          // Short CDN cache: causes rarely change mid-day, but a new
          // verified cause should surface on the next visit.
          'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err) {
    console.error('[api/fund/causes/public] fatal', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
