import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { spendXpForRedemption, parseSpendXpError } from '@/lib/perks/xp-spend'
import { spendErrorMessage } from '@/lib/perks/i18n'

export const dynamic = 'force-dynamic'

/** POST /api/perks/redeem { offer_id } */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: { offer_id?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const offerId = body.offer_id?.trim()
    if (!offerId) {
      return NextResponse.json({ error: 'offer_id required' }, { status: 400 })
    }

    try {
      const redemption = await spendXpForRedemption(supabase, user.id, offerId)
      return NextResponse.json({ success: true, redemption })
    } catch (err) {
      const code = parseSpendXpError(err instanceof Error ? err.message : undefined)
      const locale =
        request.cookies.get('preferred-language')?.value === 'en' ? 'en' : ('es' as const)
      return NextResponse.json(
        { error: spendErrorMessage(code, locale), code },
        { status: code === 'unauthorized' ? 401 : 400 }
      )
    }
  } catch (err) {
    console.error('[POST /api/perks/redeem]', err)
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 })
  }
}
