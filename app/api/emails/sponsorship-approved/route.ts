import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import { supabase } from '@/lib/supabase'
import { sendSponsorshipApprovalEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Please log in to send sponsorship emails', 'AUTHENTICATION_REQUIRED')
    }

    const { sponsorshipId } = await request.json()

    if (!sponsorshipId) {
      return ApiResponse.badRequest('Sponsorship ID is required', 'MISSING_SPONSORSHIP_ID')
    }

    // Get sponsorship details with related data
    const { data: sponsorship, error } = await supabase
      .from('sponsorships')
      .select(`
        id,
        amount,
        status,
        profiles:sponsor_id (
          email,
          full_name,
          company_name
        ),
        community_content (
          title,
          communities (
            name
          )
        )
      `)
      .eq('id', sponsorshipId)
      .single()

    if (error || !sponsorship) {
      return ApiResponse.notFound('Sponsorship', 'SPONSORSHIP_NOT_FOUND')
    }

    if ((sponsorship as any).status !== 'approved') {
      return ApiResponse.badRequest('Sponsorship not approved', 'SPONSORSHIP_NOT_APPROVED')
    }

    // Send approval email to brand
    const brandName = (sponsorship as any).profiles.company_name || (sponsorship as any).profiles.full_name
    const success = await sendSponsorshipApprovalEmail(
      (sponsorship as any).profiles.email,
      brandName,
      (sponsorship as any).community_content.title,
      (sponsorship as any).amount,
      (sponsorship as any).community_content.communities.name,
      (sponsorship as any).id
    )

    if (!success) {
      return ApiResponse.serverError('Failed to send approval email', 'SPONSORSHIP_EMAIL_ERROR')
    }

    return ApiResponse.ok({ message: 'Sponsorship approval email sent successfully' })
  } catch (error: any) {
    console.error('Sponsorship approval email error:', error)
    return ApiResponse.serverError('Internal server error', 'SPONSORSHIP_EMAIL_SERVER_ERROR', { message: error.message })
  }
}
