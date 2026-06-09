import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { APP_STORE_URL } from '@/lib/app-store'

/**
 * GET /app?ref={handle}
 *
 * Creator referral attribution endpoint. Logs a click (best-effort) and then
 * 302-redirects to the iOS App Store listing.
 *
 * Attribution is CLICK-BASED: Apple does not pass referral data into installs,
 * so anywhere this surfaces it must be labelled "clics referidos", never
 * "instalaciones" / "installs".
 *
 * Resilience: the click log is fully best-effort. If `app_referral_clicks`
 * does not exist yet (migration 231 applied manually in the dashboard), or the
 * service-role key is missing, we swallow the error and still redirect — the
 * download link must work even before the migration lands.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rawRef = request.nextUrl.searchParams.get('ref')
  // Cap length defensively; handles are short. Empty -> null (organic click).
  const refHandle = rawRef ? rawRef.slice(0, 120) : null
  const referrerUrl = request.headers.get('referer')
  const userAgent = request.headers.get('user-agent')

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('app_referral_clicks').insert({
      ref_handle: refHandle,
      referrer_url: referrerUrl,
      user_agent: userAgent,
    })
    if (error) {
      // Most likely the table isn't applied yet — log and continue.
      console.error('[app-referral] click log failed:', error.message)
    }
  } catch (e) {
    console.error(
      '[app-referral] click log threw:',
      e instanceof Error ? e.message : e
    )
  }

  return NextResponse.redirect(APP_STORE_URL, 302)
}
