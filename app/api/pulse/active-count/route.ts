import { createClient } from '@/lib/supabase-server'

/** Public: count of open Pulse markets (for nav badge). */
export async function GET() {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('prediction_markets')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .in('status', ['active', 'trading'])
      .or('is_pulse.eq.true,category.eq.pulse,and(market_type.eq.multi,category.eq.government)')

    if (error) {
      console.error('[GET /api/pulse/active-count]', error)
      return Response.json({ count: 0 })
    }

    return Response.json({ count: count ?? 0 })
  } catch (e) {
    console.error('[GET /api/pulse/active-count]', e)
    return Response.json({ count: 0 })
  }
}
