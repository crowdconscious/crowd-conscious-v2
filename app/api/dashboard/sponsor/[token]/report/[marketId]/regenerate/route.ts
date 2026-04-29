import { NextResponse } from 'next/server'

import { runSponsorPulseReport } from '@/lib/agents/sponsor-pulse-report-agent'
import { AuthSessionExpiredError, getCurrentUser } from '@/lib/auth-server'
import { marketBelongsToSponsorAccount } from '@/lib/sponsor-account-access'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Admin-only regenerate of a sponsor pulse report. Sponsors hit the
 * dashboard via token-only auth and never see this button; the page
 * doesn't render the URL for non-admins, but the route also re-validates
 * server-side so an attacker forging the path still gets a 403.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ token: string; marketId: string }> }
) {
  const { token, marketId } = await ctx.params

  // 1. Admin gate.
  let isAdmin = false
  try {
    const user = await getCurrentUser()
    if (user) {
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
      const userEmail = (user as { email?: string | null }).email
        ?.toLowerCase()
        .trim()
      if (
        user.user_type === 'admin' ||
        (!!adminEmail && !!userEmail && userEmail === adminEmail)
      ) {
        isAdmin = true
      }
    }
  } catch (e) {
    if (!(e instanceof AuthSessionExpiredError)) {
      console.warn('[sponsor-report-regenerate] auth check failed', e)
    }
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 2. Token must exist + market must belong to that sponsor account
  // (defence in depth — admin scope alone isn't enough; we still want
  //  an audit trail tied to the sponsor's token URL).
  const admin = createAdminClient()
  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, contact_email, status')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()
  if (!account) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
  }

  const { data: market } = await admin
    .from('prediction_markets')
    .select(
      'id, sponsor_account_id, sponsor_name, pulse_client_email, status, is_pulse'
    )
    .eq('id', marketId)
    .maybeSingle()

  if (
    !market ||
    !marketBelongsToSponsorAccount(market, {
      id: account.id,
      company_name: account.company_name,
      contact_email: account.contact_email,
    })
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const result = await runSponsorPulseReport(marketId)
  if (!result.success) {
    return NextResponse.json(result, { status: 500 })
  }
  return NextResponse.json(result)
}
