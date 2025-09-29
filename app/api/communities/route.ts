import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, description, address, core_values } = body

    // Validate required fields
    if (!name || !slug || !description || !address || !core_values || core_values.length < 3) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to create community' }, { status: 500 })
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

    return NextResponse.json({ data: community })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
