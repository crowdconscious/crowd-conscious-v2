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

async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // Fetch real user stats from database
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.log('⚠️ user_stats table not accessible:', error.message)
      
      // Try to create stats if table exists but record doesn't
      if (error.code === 'PGRST116') { // Record not found
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_xp: 0,
            level: 1,
            current_streak: 0,
            longest_streak: 0,
            votes_cast: 0,
            content_created: 0,
            events_attended: 0,
            comments_posted: 0,
            achievements_unlocked: []
          })
          .select()
          .single()

        if (!insertError && newStats) {
          return newStats as UserStats
        }
      }
      
      // If table doesn't exist or insert failed, return default stats
      console.log('📊 Returning default stats (run SQL migrations to enable gamification)')
      return {
        id: 'temp-' + userId,
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
    }

    return data as UserStats
  } catch (error) {
    console.error('❌ Error in getUserStats:', error)
    // Always return default stats instead of null
    return {
      id: 'temp-' + userId,
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
  }
}

async function getUserCommunities(userId: string) {
  try {
    // Fetch communities the user is a member of
    const { data, error } = await supabase
      .from('community_members')
      .select(`
        *,
        communities (
          id,
          name,
          slug,
          description,
          image_url,
          member_count,
          created_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user communities:', error)
      return []
    }

    // Extract the community data from the joined result
    return (data || []).map((membership: any) => membership.communities).filter(Boolean)
  } catch (error) {
    console.error('Error fetching user communities:', error)
    return []
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const userStats = await getUserStats((user as any).id)
  const userCommunities = await getUserCommunities((user as any).id)

  return <NewEnhancedDashboard user={user} initialUserStats={userStats} userCommunities={userCommunities} />
}
