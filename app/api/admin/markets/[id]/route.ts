import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', (user as any).id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.sponsor_name !== undefined) updates.sponsor_name = body.sponsor_name
    if (body.sponsor_logo_url !== undefined) updates.sponsor_logo_url = body.sponsor_logo_url
    if (body.sponsor_url !== undefined) updates.sponsor_url = body.sponsor_url
    if (body.sponsor_type !== undefined) updates.sponsor_type = body.sponsor_type
    if (body.sponsor_contribution !== undefined) updates.sponsor_contribution = body.sponsor_contribution

    const supabaseClient = await createClient()
    const { error } = await supabaseClient
      .from('prediction_markets')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Admin market update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin market PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
