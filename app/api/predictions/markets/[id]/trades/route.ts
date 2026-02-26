import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const { data } = await supabase.rpc('get_market_trades_anon', { p_market_id: id })
    const trades = (data ?? []).slice(0, 10)
    return NextResponse.json({ trades })
  } catch (err) {
    console.error('Trades fetch error:', err)
    return NextResponse.json({ trades: [] })
  }
}
