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
    
    // Get events happening in the next 24-48 hours (run daily)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0))
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999))
    
    const { data: events, error: eventsError } = await (supabase as any)
      .from('community_content')
      .select(`
        *,
        communities(name)
      `)
      .eq('type', 'event')
      .gte('data->>date', tomorrowStart.toISOString())
      .lte('data->>date', tomorrowEnd.toISOString())

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return ApiResponse.serverError('Failed to fetch events', 'EVENTS_FETCH_ERROR', { message: eventsError.message })
    }

    if (!events || events.length === 0) {
      return ApiResponse.ok({ message: 'No events tomorrow', events: 0, sent: 0, failed: 0, results: [] })
    }

    const results = []
    
    // For each event, get registered attendees and send reminders
    for (const event of events) {
      // Get authenticated users who registered
      const { data: registrations } = await (supabase as any)
        .from('event_registrations')
        .select(`
          user_id,
          profiles(email, full_name)
        `)
        .eq('content_id', event.id)
        .eq('status', 'registered')
      
      // Get external RSVPs (non-logged-in users)
      const { data: externalRsvps } = await (supabase as any)
        .from('external_responses')
        .select('respondent_email, respondent_name')
        .eq('content_id', event.id)
        .eq('response_type', 'event_rsvp')

      const eventDate = event.data?.date ? new Date(event.data.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : 'TBD'
      const eventTime = event.data?.time || 'TBD'
      const eventLocation = event.data?.location || 'Location TBD'
      
      // Send to authenticated users
      if (registrations) {
        for (const registration of registrations) {
          try {
            const emailTemplate = {
              subject: `🔔 Tomorrow: ${event.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #f59e0b, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Event Tomorrow!</h1>
                  </div>
                  <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1e293b; margin-top: 0;">Hi ${registration.profiles.full_name}! 👋</h2>
                    <p style="color: #475569; line-height: 1.6;">
                      This is a friendly reminder that <strong>"${event.title}"</strong> is happening tomorrow!
                    </p>
                    
                    <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                      <h3 style="margin-top: 0; color: #1e293b;">📅 Event Details:</h3>
                      <p style="margin: 10px 0; color: #475569;"><strong>Event:</strong> ${event.title}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Date:</strong> ${eventDate}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Time:</strong> ${eventTime}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Location:</strong> ${eventLocation}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Community:</strong> ${event.communities.name}</p>
                    </div>

                    ${event.description ? `
                      <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #1e293b;">About this event:</h4>
                        <p style="color: #475569; margin-bottom: 0;">${event.description}</p>
                      </div>
                    ` : ''}

                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>💡 Tip:</strong> Save the location address and add the event to your calendar!
                      </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/communities/${event.community_id}/content/${event.id}" 
                         style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
                        View Event Details
                      </a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                      We're excited to see you there! 🎉
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                      Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
                    </p>
                  </div>
                </div>
              `
            }
            
            await sendEmail(registration.profiles.email, emailTemplate)
            results.push({ user: registration.profiles.email, event: event.title, status: 'sent' })
            
            console.log(`✅ Sent event reminder to ${registration.profiles.email} for "${event.title}"`)
          } catch (error: any) {
            console.error(`❌ Failed to send to ${registration.profiles.email}:`, error)
            results.push({ user: registration.profiles.email, event: event.title, status: 'failed' })
          }
        }
      }

      // Send to external RSVPs (non-logged-in users)
      if (externalRsvps) {
        for (const rsvp of externalRsvps) {
          try {
            const emailTemplate = {
              subject: `🔔 Tomorrow: ${event.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #f59e0b, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Event Tomorrow!</h1>
                  </div>
                  <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1e293b; margin-top: 0;">Hi ${rsvp.respondent_name || 'there'}! 👋</h2>
                    <p style="color: #475569; line-height: 1.6;">
                      This is a friendly reminder that <strong>"${event.title}"</strong> is happening tomorrow!
                    </p>
                    
                    <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                      <h3 style="margin-top: 0; color: #1e293b;">📅 Event Details:</h3>
                      <p style="margin: 10px 0; color: #475569;"><strong>Event:</strong> ${event.title}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Date:</strong> ${eventDate}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Time:</strong> ${eventTime}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Location:</strong> ${eventLocation}</p>
                      <p style="margin: 10px 0; color: #475569;"><strong>Community:</strong> ${event.communities.name}</p>
                    </div>

                    ${event.description ? `
                      <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #1e293b;">About this event:</h4>
                        <p style="color: #475569; margin-bottom: 0;">${event.description}</p>
                      </div>
                    ` : ''}

                    <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <p style="margin: 0; color: #3730a3; font-size: 14px;">
                        <strong>💡 Join the community!</strong> Sign up for Crowd Conscious to stay connected and never miss an event.
                      </p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL}/share/content/${event.id}" 
                         style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
                        View Event Details
                      </a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                      We're excited to see you there! 🎉
                    </p>
                    
                    <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                      Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
                    </p>
                  </div>
                </div>
              `
            }
            
            await sendEmail(rsvp.respondent_email, emailTemplate)
            results.push({ user: rsvp.respondent_email, event: event.title, status: 'sent' })
            
            console.log(`✅ Sent event reminder to ${rsvp.respondent_email} (external) for "${event.title}"`)
          } catch (error: any) {
            console.error(`❌ Failed to send to ${rsvp.respondent_email}:`, error)
            results.push({ user: rsvp.respondent_email, event: event.title, status: 'failed' })
          }
        }
      }
    }

    return ApiResponse.ok({ 
      events: events.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results 
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return ApiResponse.serverError('Cron job failed', 'CRON_JOB_ERROR', { message: error.message })
  }
}

