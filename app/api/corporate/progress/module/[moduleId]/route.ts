import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's completed lessons for this module
    const { data: progress, error } = await supabase
      .from('module_progress')
      .select('lesson_id, completed_at, xp_earned')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .eq('status', 'completed')

    if (error) {
      console.error('Error fetching progress:', error)
      return NextResponse.json({ completedLessons: [] })
    }

    const completedLessons = progress?.map(p => p.lesson_id) || []

    return NextResponse.json({
      completedLessons,
      progress: progress || []
    })

  } catch (error) {
    console.error('Error in progress API:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

