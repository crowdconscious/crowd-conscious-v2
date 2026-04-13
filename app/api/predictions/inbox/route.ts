import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // all | market_idea | cause_proposal | ngo_suggestion | general

    let query = supabase
      .from('conscious_inbox')
      .select('id, user_id, type, title, description, category, links, status, upvotes, created_at')
      .is('archived_at', null)
      .neq('status', 'rejected')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false })

    if (type && type !== 'all') {
      if (type === 'causes') {
        query = query.in('type', ['cause_proposal', 'ngo_suggestion'])
      } else {
        query = query.eq('type', type)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Inbox fetch error:', error)
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
        names[p.id] = p.full_name || p.id.slice(0, 8) + '...'
      }
    }

    const itemsWithNames = items.map((i) => ({
      ...i,
      submitter_name: names[i.user_id] || 'Anonymous',
    }))

    return Response.json({ items: itemsWithNames })
  } catch (err) {
    console.error('Inbox GET error:', err)
    return Response.json({ error: 'Failed to fetch inbox' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, description, category, links } = body

    if (!type || !title?.trim()) {
      return Response.json({ error: 'Type and title are required' }, { status: 400 })
    }

    const validTypes = ['market_idea', 'cause_proposal', 'ngo_suggestion', 'general', 'location_nomination']
    if (!validTypes.includes(type)) {
      return Response.json({ error: 'Invalid type' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('conscious_inbox')
      .insert({
        user_id: user.id,
        type,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || null,
        links: Array.isArray(links) ? links : [],
      })
      .select()
      .single()

    if (error) {
      console.error('Inbox insert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ item: data })
  } catch (err) {
    console.error('Inbox POST error:', err)
    return Response.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
