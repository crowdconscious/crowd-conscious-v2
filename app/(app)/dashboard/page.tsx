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
  // For now, return mock data since gamification tables may not exist yet
  const mockStats: UserStats = {
    id: 'mock-id',
    user_id: userId,
    total_xp: 150,
    level: 2,
    current_streak: 3,
    longest_streak: 7,
    last_activity: new Date().toISOString(),
    votes_cast: 5,
    content_created: 2,
    events_attended: 1,
    comments_posted: 8,
    achievements_unlocked: ['first_vote', 'content_creator']
  }

  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.log('Using mock stats, user_stats table may not exist yet')
      return mockStats
    }

    return data || mockStats
  } catch (error) {
    console.log('Using mock stats, user_stats table may not exist yet')
    return mockStats
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
