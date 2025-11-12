import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to create a community')
    }

    const body = await request.json()
    const { name, slug, description, address, core_values } = body

    // Validate required fields
    if (!name || !slug || !description || !address || !core_values || core_values.length < 3) {
      return ApiResponse.badRequest('Missing required fields. Name, slug, description, address, and at least 3 core values are required.', 'MISSING_REQUIRED_FIELDS')
    }

    // Create the community
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        address: address.trim(),
        core_values: core_values,
        creator_id: user.id
      })
      .select()
      .single()

    if (communityError) {
      console.error('Community creation error:', communityError)
      
      // Handle duplicate slug error
      if (communityError.code === '23505') {
        return ApiResponse.conflict('A community with this slug already exists', 'DUPLICATE_SLUG')
      }
      
      return ApiResponse.serverError('Failed to create community', 'COMMUNITY_CREATION_ERROR', { message: communityError.message })
    }

    // Add the creator as a founder member
    const { error: memberError } = await supabase
      .from('community_members')
      .insert({
        community_id: community.id,
        user_id: user.id,
        role: 'founder'
      })

    if (memberError) {
      console.error('Error adding founder member:', memberError)
      // Don't fail the request, community was created
    }

    return ApiResponse.created({ community })

  } catch (error: any) {
    console.error('API error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMUNITY_CREATION_SERVER_ERROR', { message: error.message })
  }
}
