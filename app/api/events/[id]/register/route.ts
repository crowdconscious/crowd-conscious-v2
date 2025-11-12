import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import { sendEmail, emailTemplates } from '@/lib/resend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { id: eventId } = await params
    const { attendeeInfo } = await request.json()

    const supabase = await createServerAuth()

    // Get event details
    const { data: event, error: eventError } = await (supabase as any)
      .from('community_content')
      .select(`
        id,
        title,
        description,
        data,
        community_id,
        communities:community_id (
          name,
          creator_id
        )
      `)
      .eq('id', eventId)
      .eq('type', 'event')
      .single()

    if (eventError || !event) {
      return ApiResponse.notFound('Event', 'EVENT_NOT_FOUND')
    }

    // Check if user is a community member
    const { data: membership, error: membershipError } = await (supabase as any)
      .from('community_members')
      .select('id, role')
      .eq('community_id', event.community_id)
      .eq('user_id', (user as any).id)
      .single()

    if (membershipError || !membership) {
      return ApiResponse.forbidden('You must be a community member to register for events', 'NOT_COMMUNITY_MEMBER')
    }

    // Check if already registered
    const { data: existingRegistration } = await (supabase as any)
      .from('event_registrations')
      .select('id')
      .eq('content_id', eventId)
      .eq('user_id', (user as any).id)
      .single()

    if (existingRegistration) {
      return ApiResponse.conflict('You are already registered for this event', 'ALREADY_REGISTERED')
    }

    // Check event capacity
    const eventData = event.data || {}
    const maxAttendees = eventData.max_attendees

    if (maxAttendees) {
      const { count: currentRegistrations } = await (supabase as any)
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', eventId)

      if (currentRegistrations >= maxAttendees) {
        return ApiResponse.badRequest('Event is at full capacity', 'EVENT_FULL')
      }
    }

    // Register for event
    const { data: registration, error: registrationError } = await (supabase as any)
      .from('event_registrations')
      .insert({
        content_id: eventId,
        user_id: (user as any).id,
        attendee_info: attendeeInfo || {},
        status: 'registered'
      })
      .select()
      .single()

    if (registrationError) {
      console.error('Error creating registration:', registrationError)
      return ApiResponse.serverError('Failed to register for event', 'REGISTRATION_ERROR', { 
        message: registrationError.message 
      })
    }

    // Send confirmation email
    try {
      const eventDate = eventData.date ? new Date(eventData.date).toLocaleDateString() : 'TBD'
      const eventTime = eventData.time || 'TBD'
      const eventLocation = eventData.location || 'Location TBD'

      const confirmationEmail = {
        subject: `Event Registration Confirmed: ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Registration Confirmed!</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">
                Great news! You're registered for <strong>${event.title}</strong> in the <strong>${event.communities.name}</strong> community.
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="margin-top: 0; color: #1e293b;">Event Details:</h3>
                <p style="margin: 8px 0; color: #475569;"><strong>Event:</strong> ${event.title}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Date:</strong> ${eventDate}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Time:</strong> ${eventTime}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Location:</strong> ${eventLocation}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Community:</strong> ${event.communities.name}</p>
              </div>

              ${event.description ? `
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #1e293b;">About this event:</h4>
                  <p style="color: #475569; margin-bottom: 0;">${event.description}</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/communities/${event.community_id}/content/${eventId}" 
                   style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Event Details
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Add this event to your calendar and we'll see you there!
              </p>
            </div>
          </div>
        `
      }

      await sendEmail((user as any).email, confirmationEmail)
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the registration if email fails
    }

    return ApiResponse.created({
      registration: registration,
      message: 'Successfully registered for event!'
    })

  } catch (error: any) {
    console.error('Event registration error:', error)
    return ApiResponse.serverError('Internal server error', 'REGISTRATION_SERVER_ERROR', { 
      message: error.message 
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { id: eventId } = await params
    const supabase = await createServerAuth()

    // Delete registration
    const { error } = await (supabase as any)
      .from('event_registrations')
      .delete()
      .eq('content_id', eventId)
      .eq('user_id', (user as any).id)

    if (error) {
      console.error('Error canceling registration:', error)
      return ApiResponse.serverError('Failed to cancel registration', 'REGISTRATION_CANCEL_ERROR', { 
        message: error.message 
      })
    }

    return ApiResponse.ok({
      message: 'Registration canceled successfully'
    })

  } catch (error: any) {
    console.error('Registration cancellation error:', error)
    return ApiResponse.serverError('Internal server error', 'REGISTRATION_CANCEL_SERVER_ERROR', { 
      message: error.message 
    })
  }
}
