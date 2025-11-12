import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import { sendEmail } from '@/lib/resend'

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
    
    // Get active challenges ending in next 7 days
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const { data: challenges, error: challengesError } = await (supabase as any)
      .from('community_content')
      .select(`
        *,
        communities(name)
      `)
      .eq('type', 'challenge')
      .gte('data->>end_date', today.toISOString())
      .lte('data->>end_date', nextWeek.toISOString())

    if (challengesError) {
      console.error('Error fetching challenges:', challengesError)
      return ApiResponse.serverError('Failed to fetch challenges', 'CHALLENGES_FETCH_ERROR', { message: challengesError.message })
    }

    if (!challenges || challenges.length === 0) {
      return ApiResponse.ok({ message: 'No challenges ending soon', challenges: 0, sent: 0, failed: 0, results: [] })
    }

    const results = []
    
    // For each challenge, get community members and send reminders
    for (const challenge of challenges) {
      const { data: members } = await (supabase as any)
        .from('community_members')
        .select(`
          user_id,
          profiles(email, full_name)
        `)
        .eq('community_id', challenge.community_id)
      
      if (!members) continue

      const daysRemaining = Math.ceil(
        (new Date(challenge.data.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      for (const member of members) {
        try {
          const email = {
            subject: `⏰ Challenge Ending Soon: ${challenge.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Challenge Ending Soon!</h1>
                </div>
                <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1e293b; margin-top: 0;">Hi ${member.profiles.full_name}!</h2>
                  <p style="color: #475569; line-height: 1.6;">
                    The challenge <strong>"${challenge.title}"</strong> in <strong>${challenge.communities.name}</strong> is ending soon!
                  </p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; color: #475569; font-size: 18px;">
                      <strong style="color: #ef4444;">⏰ ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining!</strong>
                    </p>
                  </div>

                  ${challenge.description ? `
                    <p style="color: #475569; line-height: 1.6;">
                      ${challenge.description}
                    </p>
                  ` : ''}

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'}/communities/${challenge.community_id}/content/${challenge.id}" 
                       style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                      View Challenge
                    </a>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; text-align: center;">
                    Don't miss out on the impact you can make!
                  </p>
                </div>
              </div>
            `
          }
          
          await sendEmail(member.profiles.email, email)
          results.push({ user: member.profiles.email, challenge: challenge.title, status: 'sent' })
          
          console.log(`✅ Sent challenge reminder to ${member.profiles.email} for "${challenge.title}"`)
        } catch (error: any) {
          console.error(`❌ Failed to send to ${member.profiles.email}:`, error)
          results.push({ user: member.profiles.email, challenge: challenge.title, status: 'failed' })
        }
      }
    }

    return ApiResponse.ok({ 
      challenges: challenges.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results 
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return ApiResponse.serverError('Cron job failed', 'CRON_JOB_ERROR', { message: error.message })
  }
}

