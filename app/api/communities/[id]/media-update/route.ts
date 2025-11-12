import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to update community media', 'AUTHENTICATION_REQUIRED')
    }

    const { id: communityId } = await params
    const body = await request.json()
    const { field, url } = body

    // Validate inputs
    if (!field || !url) {
      return ApiResponse.badRequest('Missing field or url', 'MISSING_REQUIRED_FIELDS')
    }

    if (!['logo_url', 'banner_url', 'image_url'].includes(field)) {
      return ApiResponse.badRequest('Invalid field. Must be logo_url, banner_url, or image_url', 'INVALID_FIELD')
    }

    // Check if user is founder/admin of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['founder', 'admin'].includes(membership.role)) {
      return ApiResponse.forbidden('Only founders and admins can update community media', 'NOT_COMMUNITY_ADMIN')
    }

    // Update the community media
    const { error: updateError } = await supabase
      .from('communities')
      .update({ [field]: url })
      .eq('id', communityId)

    if (updateError) {
      console.error('Error updating community media:', updateError)
      return ApiResponse.serverError('Failed to update community media', 'MEDIA_UPDATE_ERROR', { message: updateError.message })
    }

    return ApiResponse.ok({ message: 'Media updated successfully' })

  } catch (error: any) {
    console.error('API error:', error)
    return ApiResponse.serverError('Internal server error', 'MEDIA_UPDATE_SERVER_ERROR', { message: error.message })
  }
}
