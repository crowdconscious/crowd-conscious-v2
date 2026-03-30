import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { computeMicroMarketEndDate } from '@/lib/live-market-duration'

function isEnglishBinaryYesNo(outcomes: string[]): boolean {
  if (outcomes.length !== 2) return false
  const s = new Set(outcomes.map((o) => o.toLowerCase().trim()))
  return s.size === 2 && s.has('yes') && s.has('no')
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const liveEventId = searchParams.get('live_event_id')
    const status = searchParams.get('status')

    if (!liveEventId) {
      return Response.json({ error: 'live_event_id is required' }, { status: 400 })
    }

    let q = supabase
      .from('prediction_markets')
      .select('*')
      .eq('live_event_id', liveEventId)
      .is('archived_at', null)

    if (status === 'active') {
      q = q.in('status', ['active', 'trading'])
    } else if (status === 'resolved') {
      q = q.eq('status', 'resolved')
    }

    const { data: markets, error: mErr } = await q.order('created_at', { ascending: false })

    if (mErr) {
      return Response.json({ error: mErr.message }, { status: 400 })
    }

    const rows = markets ?? []
    if (rows.length === 0) {
      return Response.json({ markets: [] })
    }

    const ids = rows.map((m) => m.id)
    const { data: outcomes, error: oErr } = await supabase
      .from('market_outcomes')
      .select('*')
      .in('market_id', ids)
      .order('sort_order', { ascending: true })

    if (oErr) {
      return Response.json({ error: oErr.message }, { status: 400 })
    }

    const byMarket = new Map<string, typeof outcomes>()
    for (const o of outcomes ?? []) {
      const mid = o.market_id
      if (!byMarket.has(mid)) byMarket.set(mid, [])
      byMarket.get(mid)!.push(o)
    }

    const merged = rows.map((m) => ({
      ...m,
      outcomes: byMarket.get(m.id) ?? [],
    }))

    return Response.json({ markets: merged })
  } catch (e) {
    console.error('[GET /api/live/markets]', e)
    return Response.json({ error: 'Failed to list markets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      live_event_id,
      title,
      outcomes,
      expires_in_minutes,
      duration_preset,
      sponsor_label,
      translations,
      category = 'world_cup',
    } = body

    if (!live_event_id || !title?.trim()) {
      return Response.json({ error: 'live_event_id and title are required' }, { status: 400 })
    }

    const outcomeList: string[] = Array.isArray(outcomes)
      ? outcomes.map((o: string) => String(o).trim()).filter(Boolean)
      : []

    if (outcomeList.length < 2) {
      return Response.json({ error: 'At least two outcomes are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: liveEvent, error: evErr } = await admin
      .from('live_events')
      .select('match_date')
      .eq('id', live_event_id)
      .single()

    if (evErr || !liveEvent) {
      return Response.json({ error: 'Live event not found' }, { status: 404 })
    }

    const endDate = computeMicroMarketEndDate(liveEvent.match_date, {
      expiresInMinutes:
        typeof expires_in_minutes === 'number' && expires_in_minutes > 0 ? expires_in_minutes : null,
      preset:
        duration_preset === 'halftime' || duration_preset === 'fulltime' ? duration_preset : null,
    })

    const minutesUntilEnd = Math.max(
      1,
      Math.round((new Date(endDate).getTime() - Date.now()) / 60000)
    )

    const desc =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : `${title.trim()} — micro-market (Conscious Live).`
    const rc =
      typeof body.resolution_criteria === 'string' && body.resolution_criteria.trim()
        ? body.resolution_criteria.trim()
        : 'Resolved by admin during Conscious Live.'

    let marketId: string

    if (isEnglishBinaryYesNo(outcomeList)) {
      const { data: binId, error: rpcErr } = await admin.rpc('create_binary_market', {
        p_title: title.trim(),
        p_description: desc,
        p_category: category,
        p_created_by: user.id,
        p_end_date: endDate,
        p_sponsor_name: null,
        p_sponsor_logo_url: null,
        p_image_url: null,
        p_resolution_criteria: rc,
      })

      if (rpcErr) {
        console.error('[POST /api/live/markets] binary', rpcErr)
        return Response.json({ error: rpcErr.message }, { status: 400 })
      }
      marketId = binId as string
    } else {
      const { data: multiId, error: rpcErr } = await admin.rpc('create_multi_market', {
        p_title: title.trim(),
        p_description: desc,
        p_category: category,
        p_created_by: user.id,
        p_end_date: endDate,
        p_outcomes: outcomeList,
        p_sponsor_name: null,
        p_sponsor_logo_url: null,
        p_image_url: null,
        p_resolution_criteria: rc,
      })

      if (rpcErr) {
        console.error('[POST /api/live/markets] multi', rpcErr)
        return Response.json({ error: rpcErr.message }, { status: 400 })
      }
      marketId = multiId as string
    }

    const updatePayload: Record<string, unknown> = {
      is_micro_market: true,
      live_event_id,
      sponsor_label: sponsor_label?.trim() || null,
      expires_in_minutes: minutesUntilEnd,
      resolution_date: endDate,
    }

    if (translations && typeof translations === 'object') {
      updatePayload.translations = translations
    }

    const { error: upErr } = await admin.from('prediction_markets').update(updatePayload).eq('id', marketId)

    if (upErr) {
      console.error('[POST /api/live/markets] update', upErr)
      return Response.json({ error: upErr.message }, { status: 400 })
    }

    const { data: marketRow } = await admin.from('prediction_markets').select('*').eq('id', marketId).single()
    const { data: outcomeRows } = await admin
      .from('market_outcomes')
      .select('*')
      .eq('market_id', marketId)
      .order('sort_order', { ascending: true })

    return Response.json({
      market: marketRow,
      outcomes: outcomeRows ?? [],
    })
  } catch (e) {
    console.error('[POST /api/live/markets]', e)
    return Response.json({ error: 'Failed to create market' }, { status: 500 })
  }
}
