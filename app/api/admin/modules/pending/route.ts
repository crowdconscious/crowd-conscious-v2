import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.user_type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch all modules with review status
    const { data: modules, error } = await (supabase as any)
      .from('marketplace_modules')
      .select(`
        *,
        communities (name, slug),
        profiles (full_name, email)
      `)
      .eq('status', 'review')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending modules:', error)
      return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }

    return NextResponse.json({ modules: modules || [] })
  } catch (error) {
    console.error('Error in GET /api/admin/modules/pending:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

