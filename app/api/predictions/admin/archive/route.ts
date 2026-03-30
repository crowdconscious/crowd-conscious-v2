import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

type Resource = 'market' | 'inbox' | 'agent_content'

function isAdmin(profile: { user_type?: string } | null, email: string | null | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = email?.toLowerCase().trim()
  return profile?.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)
}

/** Manual archive (admin): sets archived_at to now */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await createClient()
    const { data: profile } = await client
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()

    if (!isAdmin(profile as { user_type?: string }, (user as { email?: string | null }).email)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const resource = body.resource as Resource
    const id = body.id as string
    if (!id || !['market', 'inbox', 'agent_content'].includes(resource)) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const admin = createAdminClient()

    if (resource === 'market') {
      const { error } = await admin
        .from('prediction_markets')
        .update({ archived_at: now })
        .eq('id', id)
        .is('archived_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (resource === 'inbox') {
      const { error } = await admin
        .from('conscious_inbox')
        .update({ archived_at: now })
        .eq('id', id)
        .is('archived_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await admin
        .from('agent_content')
        .update({ archived_at: now })
        .eq('id', id)
        .is('archived_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, archived_at: now })
  } catch (err) {
    console.error('archive POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
