import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import { sendEmail, emailTemplates } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return ApiResponse.unauthorized('Invalid cron secret', 'INVALID_CRON_SECRET')
  }

  try {
    const supabase = await createServerAuth()
    
    // Get all users
    const { data: users, error: usersError } = await (supabase as any)
      .from('profiles')
      .select('id, email, full_name')
    
    if (usersError || !users) {
      console.error('Error fetching users:', usersError)
      return ApiResponse.serverError('Failed to fetch users', 'USERS_FETCH_ERROR', { message: usersError?.message })
    }

    const results = []
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    // Send email to each user with their personalized stats
    for (const user of users) {
      try {
        // Get user stats
        const { data: userStats } = await (supabase as any)
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        // Get user's communities
        const { data: memberships } = await (supabase as any)
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id)

        // Get user's XP transactions from last month
        const { data: xpTransactions } = await (supabase as any)
          .from('xp_transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', lastMonth.toISOString())

        // Calculate monthly stats
        const monthlyXP = xpTransactions?.reduce((sum: number, t: any) => sum + t.xp_amount, 0) || 0

        // Get new achievements
        const { data: achievements } = await (supabase as any)
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id)
          .gte('earned_at', lastMonth.toISOString())

        // Combine all data into single stats object
        const stats = {
          // Gamification stats
          level: userStats?.level || 1,
          totalXP: userStats?.total_xp || 0,
          currentStreak: userStats?.current_streak || 0,
          
          // Activity counts
          communitiesJoined: memberships?.length || 0,
          contentCreated: xpTransactions?.filter((t: any) => t.action_type === 'content_create').length || 0,
          votesCount: xpTransactions?.filter((t: any) => t.action_type === 'vote').length || 0,
          eventsAttended: xpTransactions?.filter((t: any) => t.action_type === 'event_attend').length || 0,
          commentsPosted: xpTransactions?.filter((t: any) => t.action_type === 'comment').length || 0,
          impactContributed: 0, // Can calculate from sponsorships later
          
          // New achievements (would need to query achievement names)
          newAchievements: achievements && achievements.length > 0 ? 
            Array(achievements.length).fill('New Achievement Unlocked!') : [],
          
          // Environmental impact metrics
          impactMetrics: {
            zeroWaste: Math.round((monthlyXP / 10) * 100) / 100,
            cleanAir: Math.round((monthlyXP / 15) * 100) / 100,
            cleanWater: Math.round((monthlyXP / 12) * 100) / 100,
            safeCities: Math.floor(monthlyXP / 100)
          }
        }

        const monthlyImpactEmail = emailTemplates.monthlyImpactReport(
          user.full_name || 'Community Member',
          stats
        )

        await sendEmail(user.email, monthlyImpactEmail)
        results.push({ user: user.email, status: 'sent' })
        
        console.log(`✅ Sent monthly impact email to ${user.email}`)
      } catch (error: any) {
        console.error(`❌ Failed to send to ${user.email}:`, error)
        results.push({ user: user.email, status: 'failed', error: error.message })
      }
    }

    return ApiResponse.ok({ 
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results 
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return ApiResponse.serverError('Cron job failed', 'CRON_JOB_ERROR', { message: error.message })
  }
}

