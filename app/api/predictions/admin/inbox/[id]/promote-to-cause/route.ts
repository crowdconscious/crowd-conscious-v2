import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

const CATEGORIES = ['water', 'education', 'environment', 'social_justice', 'health', 'other'] as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    if (!id) return Response.json({ error: 'Missing inbox item id' }, { status: 400 })

    const body = await request.json()
    const { name, organization, category, description, website_url } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!organization || typeof organization !== 'string' || !organization.trim()) {
      return NextResponse.json({ error: 'Organization is required' }, { status: 400 })
    }
    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const { data: inboxItem, error: inboxErr } = await admin
      .from('conscious_inbox')
      .select('id')
      .eq('id', id)
      .single()

    if (inboxErr || !inboxItem) {
      return NextResponse.json({ error: 'Inbox item not found' }, { status: 404 })
    }

    const insert: Record<string, unknown> = {
      name: name.trim(),
      organization: organization.trim(),
      category,
      description: description.trim().slice(0, 500),
      active: true,
    }
    if (website_url && typeof website_url === 'string' && website_url.trim()) {
      insert.website_url = website_url.trim()
    }

    const { data: cause, error: causeErr } = await admin
      .from('fund_causes')
      .insert(insert)
      .select()
      .single()

    if (causeErr) {
      console.error('[promote-to-cause] insert error:', causeErr)
      return NextResponse.json({ error: causeErr.message }, { status: 500 })
    }

    const { error: updateErr } = await admin
      .from('conscious_inbox')
      .update({ status: 'promoted_to_cause', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateErr) {
      console.error('[promote-to-cause] inbox update error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ cause })
  } catch (err) {
    console.error('[promote-to-cause] error:', err)
    return NextResponse.json({ error: 'Failed to promote' }, { status: 500 })
  }
}
