import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import { sendEmail, emailTemplates } from '@/lib/resend'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return ApiResponse.unauthorized('Invalid cron secret', 'INVALID_CRON_SECRET')
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck('monthly-impact', admin)

  try {
    const supabase = await createServerAuth()

    const { data: users, error: usersError } = await (supabase as any)
      .from('profiles')
      .select('id, email, full_name')

    if (usersError || !users) {
      console.error('Error fetching users:', usersError)
      await cronHealthComplete(runId, 'monthly-impact', admin, {
        success: false,
        error: usersError?.message ?? 'Failed to fetch users',
      })
      return ApiResponse.serverError('Failed to fetch users', 'USERS_FETCH_ERROR', {
        message: usersError?.message,
      })
    }

    const results = []
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    for (const user of users) {
      if (!user.email) continue
      try {
        const { data: userStats } = await (supabase as any)
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        const memberships: any[] = []

        const { data: xpTransactions } = await (supabase as any)
          .from('xp_transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', lastMonth.toISOString())

        const monthlyXP = xpTransactions?.reduce((sum: number, t: any) => sum + t.xp_amount, 0) || 0

        const { data: achievements } = await (supabase as any)
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id)
          .gte('earned_at', lastMonth.toISOString())

        const stats = {
          level: userStats?.level || 1,
          totalXP: userStats?.total_xp || 0,
          currentStreak: userStats?.current_streak || 0,
          communitiesJoined: memberships?.length || 0,
          contentCreated: xpTransactions?.filter((t: any) => t.action_type === 'content_create').length || 0,
          votesCount: xpTransactions?.filter((t: any) => t.action_type === 'vote').length || 0,
          eventsAttended: xpTransactions?.filter((t: any) => t.action_type === 'event_attend').length || 0,
          commentsPosted: xpTransactions?.filter((t: any) => t.action_type === 'comment').length || 0,
          impactContributed: 0,
          newAchievements:
            achievements && achievements.length > 0
              ? Array(achievements.length).fill('New Achievement Unlocked!')
              : [],
          impactMetrics: {
            zeroWaste: Math.round((monthlyXP / 10) * 100) / 100,
            cleanAir: Math.round((monthlyXP / 15) * 100) / 100,
            cleanWater: Math.round((monthlyXP / 12) * 100) / 100,
            safeCities: Math.floor(monthlyXP / 100),
          },
        }

        const monthlyImpactEmail = emailTemplates.monthlyImpactReport(user.full_name || 'Community Member', stats)

        await sendEmail(user.email, monthlyImpactEmail)
        results.push({ user: user.email, status: 'sent' })

        console.log(`✅ Sent monthly impact email to ${user.email}`)
      } catch (error: any) {
        console.error(`❌ Failed to send to ${user.email}:`, error)
        results.push({ user: user.email, status: 'failed', error: error.message })
      }
    }

    const sent = results.filter((r) => r.status === 'sent').length
    const failed = results.filter((r) => r.status === 'failed').length

    await cronHealthComplete(runId, 'monthly-impact', admin, {
      success: true,
      summary: `sent ${sent}, failed ${failed}`,
    })

    return ApiResponse.ok({
      sent,
      failed,
      results,
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    await cronHealthComplete(runId, 'monthly-impact', admin, {
      success: false,
      error: error?.message ?? String(error),
    })
    return ApiResponse.serverError('Cron job failed', 'CRON_JOB_ERROR', { message: error.message })
  }
}
