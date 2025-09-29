import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to get existing user stats
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No record found, create initial user stats
      const initialStats = {
        user_id: user.id,
        total_xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_activity: new Date().toISOString(),
        votes_cast: 0,
        content_created: 0,
        events_attended: 0,
        comments_posted: 0,
        achievements_unlocked: []
      }

      const { data: newStats, error: insertError } = await supabase
        .from('user_stats')
        .insert(initialStats)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user stats:', insertError)
        return NextResponse.json({ error: 'Failed to create user stats' }, { status: 500 })
      }

      return NextResponse.json({ data: newStats })
    }

    if (error) {
      console.error('Error fetching user stats:', error)
      return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
