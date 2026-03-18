import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

const CATEGORIES = ['water', 'education', 'environment', 'social_justice', 'health', 'other'] as const

function requireAdmin() {
  return async () => {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized', status: 401 as const }
    if (user.user_type !== 'admin') return { error: 'Admin only', status: 403 as const }
    return { user }
  }
}

export async function GET() {
  const auth = await requireAdmin()()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const admin = createAdminClient()
    const cycle = new Date().toISOString().slice(0, 7)

    const [
      { data: causes, error: causesErr },
      { data: votes },
    ] = await Promise.all([
      admin.from('fund_causes').select('*').order('created_at', { ascending: false }),
      admin.from('fund_votes').select('cause_id').eq('cycle', cycle),
    ])

    if (causesErr) {
      console.error('[admin/causes] fetch error:', causesErr)
      return NextResponse.json({ error: causesErr.message }, { status: 500 })
    }

    const voteCountByCause: Record<string, number> = {}
    for (const v of votes ?? []) {
      const id = v.cause_id
      voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
    }

    const causesWithVotes = (causes ?? []).map((c) => ({
      ...c,
      vote_count: voteCountByCause[c.id] ?? 0,
    }))

    return NextResponse.json({ causes: causesWithVotes })
  } catch (err) {
    console.error('[admin/causes] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const { name, organization, category, description, website_url, image_url } = body

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

    const admin = createAdminClient()
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
    if (image_url && typeof image_url === 'string' && image_url.trim()) {
      insert.image_url = image_url.trim()
    }

    const { data, error } = await admin
      .from('fund_causes')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('[admin/causes] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cause: data })
  } catch (err) {
    console.error('[admin/causes] POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const { id, name, organization, category, description, website_url, image_url, active } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const updates: Record<string, unknown> = {}

    if (name !== undefined) updates.name = typeof name === 'string' ? name.trim() : name
    if (organization !== undefined) updates.organization = typeof organization === 'string' ? organization.trim() : organization
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      updates.category = category
    }
    if (description !== undefined) updates.description = typeof description === 'string' ? description.trim().slice(0, 500) : description
    if (website_url !== undefined) updates.website_url = website_url && typeof website_url === 'string' ? website_url.trim() : null
    if (image_url !== undefined) updates.image_url = image_url && typeof image_url === 'string' ? image_url.trim() : null
    if (active !== undefined) updates.active = !!active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('fund_causes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/causes] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cause: data })
  } catch (err) {
    console.error('[admin/causes] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
