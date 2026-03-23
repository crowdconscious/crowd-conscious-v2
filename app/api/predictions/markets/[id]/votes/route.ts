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
    const { data: votes, error } = await supabase
      .from('market_votes')
      .select('user_id, outcome_id, confidence, created_at, is_anonymous')
      .eq('market_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Votes fetch error:', error)
      return NextResponse.json({ predictions: [] })
    }

    const outcomeIds = [...new Set((votes ?? []).map((v) => v.outcome_id))]
    const userIds = [...new Set((votes ?? []).map((v) => v.user_id))]

    const [outcomesRes, profilesRes] = await Promise.all([
      outcomeIds.length > 0
        ? supabase.from('market_outcomes').select('id, label').in('id', outcomeIds)
        : Promise.resolve({ data: [] }),
      userIds.length > 0
        ? supabase.from('profiles').select('id, full_name').in('id', userIds)
        : Promise.resolve({ data: [] }),
    ])

    const outcomeMap = new Map(
      (outcomesRes.data ?? []).map((o) => [o.id, o.label])
    )
    const profileMap = new Map(
      (profilesRes.data ?? []).map((p) => [p.id, p.full_name || 'Anonymous'])
    )

    const predictions = (votes ?? []).map((v) => ({
      user_name: v.is_anonymous
        ? 'Invitado'
        : profileMap.get(v.user_id) || 'Anonymous',
      outcome_label: outcomeMap.get(v.outcome_id) || 'Unknown',
      confidence: v.confidence,
      created_at: v.created_at,
    }))

    return NextResponse.json({ predictions })
  } catch (err) {
    console.error('Votes fetch error:', err)
    return NextResponse.json({ predictions: [] })
  }
}
