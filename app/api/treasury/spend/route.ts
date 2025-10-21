import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { communityId, contentId, amount, sponsorshipId, description } = body

    if (!communityId || !contentId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Community ID, content ID, and valid amount are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerAuth()

    // Check if user is a community admin
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', (user as any).id)
      .single()

    if (!membership || (membership.role !== 'admin' && membership.role !== 'moderator')) {
      return NextResponse.json(
        { error: 'Only community admins can spend from the treasury' },
        { status: 403 }
      )
    }

    // Use SQL function to spend from treasury
    const { data, error } = await (supabase as any).rpc('spend_from_treasury', {
      p_community_id: communityId,
      p_amount: amount,
      p_sponsored_content_id: contentId,
      p_sponsorship_id: sponsorshipId || null,
      p_description: description || null,
      p_created_by: (user as any).id
    })

    if (error) {
      console.error('Error spending from treasury:', error)
      if (error.message.includes('Insufficient funds')) {
        return NextResponse.json(
          { error: 'Insufficient funds in community treasury' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update the sponsorship status to 'paid' since it's paid from pool
    if (sponsorshipId) {
      const { error: updateError } = await supabase
        .from('sponsorships')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          funded_by_treasury: true
        })
        .eq('id', sponsorshipId)

      if (updateError) {
        console.error('Error updating sponsorship:', updateError)
        // Don't fail the whole process
      }
    }

    // Update content funding if it's a need
    const { data: content } = await supabase
      .from('community_content')
      .select('type, current_funding')
      .eq('id', contentId)
      .single()

    if (content && content.type === 'need') {
      const newFunding = (content.current_funding || 0) + amount
      await supabase
        .from('community_content')
        .update({ current_funding: newFunding })
        .eq('id', contentId)
    }

    return NextResponse.json({
      success: true,
      transaction_id: data,
      message: 'Successfully sponsored from community pool'
    })
  } catch (error: any) {
    console.error('Treasury spending error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to spend from treasury' },
      { status: 500 }
    )
  }
}

