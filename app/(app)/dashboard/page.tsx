import { getCurrentUser } from '../../../lib/auth-server'
import { supabase } from '../../../lib/supabase'
import { redirect } from 'next/navigation'
import NewEnhancedDashboard from './NewEnhancedDashboard'

// Force dynamic rendering due to authentication checks
export const dynamic = 'force-dynamic'

interface UserStats {
  id: string
  user_id: string
  total_xp: number
  level: number
  current_streak: number
  longest_streak: number
  last_activity: string
  votes_cast: number
  content_created: number
  events_attended: number
  comments_posted: number
  achievements_unlocked: string[]
}

async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No record found, create initial user stats
      const initialStats = {
        user_id: userId,
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
        return null
      }

      return newStats
    }

    if (error) {
      console.error('Error fetching user stats:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserStats:', error)
    return null
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const userStats = await getUserStats((user as any).id)

  return <NewEnhancedDashboard user={user} initialUserStats={userStats} />
}
