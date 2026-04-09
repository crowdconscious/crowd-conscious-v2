import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { loadMarketVoteReasoningsWithAuthors } from '@/lib/market-vote-reasonings'

export const dynamic = 'force-dynamic'

/**
 * Public read of vote reasonings with resolved author labels (admin client; no fragile PostgREST embeds).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await context.params
    const { searchParams } = new URL(_request.url)
    const locale = searchParams.get('lang') === 'en' ? 'en' : 'es'

    const admin = createAdminClient()
    const reasonings = await loadMarketVoteReasoningsWithAuthors(admin, marketId, locale)

    return NextResponse.json({ reasonings })
  } catch (e) {
    console.error('[vote-reasonings GET]', e)
    return NextResponse.json({ reasonings: [] }, { status: 500 })
  }
}
