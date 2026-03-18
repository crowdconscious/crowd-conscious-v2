import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    if (!id) {
      return Response.json({ error: 'Missing inbox item id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('conscious_inbox')
      .select('id, title, description, category, links')
      .eq('id', id)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Inbox item not found' }, { status: 404 })
    }

    return Response.json({
      item: {
        ...data,
        links: Array.isArray(data.links) ? data.links : [],
      },
    })
  } catch (err) {
    console.error('Admin inbox GET [id] error:', err)
    return Response.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    if (!id) {
      return Response.json({ error: 'Missing inbox item id' }, { status: 400 })
    }

    const body = await request.json()
    const { status, admin_notes } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (status !== undefined) {
      const valid = ['pending', 'reviewed', 'approved', 'rejected', 'published', 'promoted_to_cause']
      if (!valid.includes(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
    }

    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes === '' ? null : admin_notes
    }

    const { data, error } = await supabase
      .from('conscious_inbox')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Admin inbox update error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ item: data })
  } catch (err) {
    console.error('Admin inbox PATCH error:', err)
    return Response.json({ error: 'Failed to update' }, { status: 500 })
  }
}
