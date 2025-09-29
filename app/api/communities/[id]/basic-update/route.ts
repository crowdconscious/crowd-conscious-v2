import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id: communityId } = await params
    const { name, description, address, core_values } = await request.json()

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      )
    }

    if (!core_values || !Array.isArray(core_values) || core_values.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 core values are required' },
        { status: 400 }
      )
    }

    // Check permissions - only founders can update basic info
    const isFounder = await checkFounderPermission(communityId, (user as any).id)
    if (!isFounder) {
      return NextResponse.json(
        { error: 'Only community founders can update basic information' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: updateError.message || 'Failed to update community' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('API error updating community basic info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
