import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: communityId } = await params
    const body = await request.json()
    const { field, url } = body

    // Validate inputs
    if (!field || !url) {
      return NextResponse.json({ error: 'Missing field or url' }, { status: 400 })
    }

    if (!['logo_url', 'banner_url', 'image_url'].includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    // Check if user is founder/admin of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['founder', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only founders and admins can update community media' }, { status: 403 })
    }

    // Update the community media
    const { error: updateError } = await supabase
      .from('communities')
      .update({ [field]: url })
      .eq('id', communityId)

    if (updateError) {
      console.error('Error updating community media:', updateError)
      return NextResponse.json({ error: 'Failed to update community media' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Media updated successfully' })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
