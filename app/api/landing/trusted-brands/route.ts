import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public list of brands for the landing-page Trusted Brands row.
 *
 * A brand renders if EITHER:
 *  - they paid a high-trust tier (`mundial_pack`, `mundial_pack_founding`,
 *    `enterprise`), AND have an active sponsor account, OR
 *  - the founder manually flipped `case_study_featured = true` after the
 *    brand signed off on being listed (audit §3.2).
 *
 * We never render a sponsor without a `logo_url`; an empty logo would look
 * like a broken image and cheapen the row. Cap at 24 to keep payload tiny.
 *
 * Cached for 5 min — the landing page is anonymous and these change at most
 * weekly. Use the admin toggle if you need an immediate refresh.
 */
const HIGH_TRUST_TIERS = new Set([
  'mundial_pack',
  'mundial_pack_founding',
  'enterprise',
])

export type TrustedBrand = {
  id: string
  company_name: string
  logo_url: string
  tier: string
  case_study_featured: boolean
}

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sponsor_accounts')
      .select('id, company_name, logo_url, tier, case_study_featured, status')
      .or(
        `case_study_featured.eq.true,tier.in.(${[...HIGH_TRUST_TIERS].join(',')})`
      )
      .eq('status', 'active')
      .not('logo_url', 'is', null)
      .order('case_study_featured', { ascending: false })
      .order('total_spent', { ascending: false, nullsFirst: false })
      .limit(24)

    if (error) {
      console.error('[landing/trusted-brands]', error)
      return NextResponse.json({ brands: [] as TrustedBrand[] }, { status: 200 })
    }

    const brands: TrustedBrand[] = (data ?? [])
      .filter((b): b is { id: string; company_name: string; logo_url: string; tier: string; case_study_featured: boolean; status: string | null } =>
        typeof b.logo_url === 'string' && b.logo_url.trim().length > 0
      )
      .map((b) => ({
        id: b.id,
        company_name: b.company_name,
        logo_url: b.logo_url,
        tier: b.tier,
        case_study_featured: !!b.case_study_featured,
      }))

    return NextResponse.json(
      { brands },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=900',
        },
      }
    )
  } catch (e) {
    console.error('[landing/trusted-brands]', e)
    return NextResponse.json({ brands: [] as TrustedBrand[] }, { status: 200 })
  }
}
