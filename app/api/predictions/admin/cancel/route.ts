import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { market_id, reason } = body

    if (!market_id) {
      return NextResponse.json(
        { error: 'market_id required' },
        { status: 400 }
      )
    }

    const { error } = await supabase.rpc('cancel_prediction_market', {
      p_market_id: market_id,
      p_reason: reason || null,
    })

    if (error) {
      console.error('Cancel error:', error)
      return NextResponse.json(
        { error: error.message || 'Cancellation failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Cancel route error:', err)
    return NextResponse.json(
      { error: 'Cancellation failed' },
      { status: 500 }
    )
  }
}
