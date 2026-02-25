import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_or_create_prediction_wallet', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Wallet fetch error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    return NextResponse.json({ wallet: data })
  } catch (err) {
    console.error('Wallet route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    )
  }
}
