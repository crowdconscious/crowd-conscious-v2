import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { moduleId, lessonId, xpEarned, activityData } = body

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('training_xp, training_level, corporate_account_id')
      .eq('id', user.id)
      .single()

    // Check if lesson already completed
    const { data: existing } = await supabase
      .from('module_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .eq('lesson_id', lessonId)
      .eq('status', 'completed')
      .single()

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Lesson already completed' 
      })
    }

    // Record lesson completion
    const { error: progressError } = await supabase
      .from('module_progress')
      .insert({
        user_id: user.id,
        module_id: moduleId,
        lesson_id: lessonId,
        corporate_account_id: profile?.corporate_account_id,
        status: 'completed',
        completion_percentage: 100,
        xp_earned: xpEarned,
        activity_data: activityData
      })

    if (progressError) {
      console.error('Error saving progress:', progressError)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    // Update user's XP and level
    const currentXP = profile?.training_xp || 0
    const newXP = currentXP + xpEarned
    const newLevel = Math.floor(newXP / 1000) + 1 // Every 1000 XP = 1 level

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        training_xp: newXP,
        training_level: newLevel
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile XP:', profileError)
    }

    // Check if module is now complete
    const { data: allProgress } = await supabase
      .from('module_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .eq('status', 'completed')

    const completedLessons = allProgress?.length || 0
    
    // For clean_air module, there are 3 lessons
    const totalLessons = 3
    const moduleComplete = completedLessons >= totalLessons

    if (moduleComplete) {
      // Update course_enrollments to mark module as completed
      await supabase
        .from('course_enrollments')
        .update({
          status: 'completed',
          completion_percentage: 100,
          completed_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
    }

    return NextResponse.json({
      success: true,
      xpEarned,
      newXP,
      newLevel,
      moduleComplete
    })

  } catch (error) {
    console.error('Error completing lesson:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

