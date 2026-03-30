import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // all | pending | reviewed | approved | rejected
    const type = searchParams.get('type') // all | market_idea | causes | general
    const sort = searchParams.get('sort') || 'upvotes' // upvotes | newest | oldest
    const includeArchived = searchParams.get('includeArchived') === '1'

    let query = supabase
      .from('conscious_inbox')
      .select(
        'id, user_id, type, title, description, category, links, status, admin_notes, upvotes, created_at, archived_at'
      )

    if (!includeArchived) {
      query = query.is('archived_at', null)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (type && type !== 'all') {
      if (type === 'causes') {
        query = query.in('type', ['cause_proposal', 'ngo_suggestion'])
      } else {
        query = query.eq('type', type)
      }
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else {
      query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Admin inbox fetch error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const items = (data || []) as Array<{ user_id: string; [k: string]: unknown }>
    const userIds = [...new Set(items.map((i) => i.user_id))]
    const names: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
      for (const p of profiles || []) {
        const profileRow = p as { id: string; full_name: string | null }
        names[profileRow.id] = profileRow.full_name || profileRow.id.slice(0, 8) + '...'
      }
    }

    const itemsWithNames = items.map((i) => ({
      ...i,
      links: Array.isArray(i.links) ? i.links : [],
      submitter_name: names[i.user_id] || 'Anonymous',
    }))

    return Response.json({ items: itemsWithNames })
  } catch (err) {
    console.error('Admin inbox GET error:', err)
    return Response.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
