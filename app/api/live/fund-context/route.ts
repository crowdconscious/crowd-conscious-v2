import { createAdminClient } from '@/lib/supabase-admin'
import { fetchLeadingFundCause } from '@/lib/live-fund-leading-cause'

export const dynamic = 'force-dynamic'

/**
 * Public: leading Conscious Fund cause for the current cycle (same as /predictions/fund).
 */
export async function GET() {
  try {
    const admin = createAdminClient()
    const leading = await fetchLeadingFundCause(admin)
    return Response.json({
      leadingCause: leading,
      cycle: new Date().toISOString().slice(0, 7),
    })
  } catch (e) {
    console.error('[GET /api/live/fund-context]', e)
    return Response.json({ leadingCause: null, cycle: null }, { status: 200 })
  }
}
