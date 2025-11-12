import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

async function checkFounderPermission(communityId: string, userId: string): Promise<boolean> {
  const supabase = await createServerAuth()
  const { data: membership, error } = await (supabase as any)
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error checking founder permission:', error)
    return false
  }

  return (membership as any)?.role === 'founder'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { id: communityId } = await params
    const { name, description, address, core_values } = await request.json()

    // Validate required fields
    if (!name || !name.trim()) {
      return ApiResponse.badRequest('Community name is required', 'MISSING_COMMUNITY_NAME')
    }

    if (!core_values || !Array.isArray(core_values) || core_values.length < 3) {
      return ApiResponse.badRequest('At least 3 core values are required', 'INSUFFICIENT_CORE_VALUES')
    }

    // Check permissions - only founders can update basic info
    const isFounder = await checkFounderPermission(communityId, (user as any).id)
    if (!isFounder) {
      return ApiResponse.forbidden('Only community founders can update basic information', 'NOT_FOUNDER')
    }

    const supabase = await createServerAuth()
    const { error: updateError } = await (supabase as any)
      .from('communities')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        core_values: core_values
      })
      .eq('id', communityId)

    if (updateError) {
      console.error('Error updating community basic info:', updateError)
      return ApiResponse.serverError('Failed to update community', 'COMMUNITY_UPDATE_ERROR', { 
        message: updateError.message 
      })
    }

    return ApiResponse.ok({ success: true })

  } catch (error: any) {
    console.error('API error updating community basic info:', error)
    return ApiResponse.serverError('Internal server error', 'COMMUNITY_UPDATE_SERVER_ERROR', { 
      message: error.message 
    })
  }
}
