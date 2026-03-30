import { createClient } from '@/lib/supabase-server'

/** Public: count of open Pulse markets (for nav badge). */
export async function GET() {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('prediction_markets')
      .select('id', { count: 'exact', head: true })
      .eq('is_pulse', true)
      .in('status', ['active', 'trading'])
      .is('archived_at', null)

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
