import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await createClient()
    const { data: profile } = await client
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('agent_content')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('Agent content fetch error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await createClient()
    const { data: profile } = await client
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (typeof body.published === 'boolean') updates.published = body.published
    if (body.market_id !== undefined) updates.market_id = body.market_id
    if (body.metadata && typeof body.metadata === 'object') {
      const admin = createAdminClient()
      const { data: existing } = await admin
        .from('agent_content')
        .select('metadata')
        .eq('id', id)
        .single()
      const currentMeta = (existing as { metadata?: Record<string, unknown> })?.metadata ?? {}
      updates.metadata = { ...currentMeta, ...body.metadata }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('agent_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Agent content update error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
