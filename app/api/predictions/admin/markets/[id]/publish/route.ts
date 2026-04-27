import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

function isAdminUser(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = (user as { email?: string | null }).email?.toLowerCase().trim()
  return user.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const admin = createAdminClient()

    const { data: market, error: fetchErr } = await admin
      .from('prediction_markets')
      .select('id, is_draft, created_by')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) {
      console.error('Publish market fetch error:', fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    const isAdmin = isAdminUser(user)
    const isCreator = market.created_by === user.id
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!market.is_draft) {
      // Idempotent: already published.
      return NextResponse.json({ success: true, already_published: true })
    }

    const { error: upErr } = await admin
      .from('prediction_markets')
      .update({
        is_draft: false,
        published_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (upErr) {
      console.error('Publish market update error:', upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Publish market error:', err)
    return NextResponse.json({ error: 'Failed to publish market' }, { status: 500 })
  }
}
