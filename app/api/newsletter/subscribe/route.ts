import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const name = body.name != null ? String(body.name).trim() : null
    const source = body.source != null ? String(body.source).slice(0, 80) : 'landing_page'
    const language = body.language != null ? String(body.language).slice(0, 8) : 'es'

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('newsletter_subscribers').upsert(
      {
        email,
        name,
        source,
        language,
        is_active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: 'email' }
    )

    if (error) {
      console.error('[newsletter/subscribe]', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[newsletter/subscribe]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
