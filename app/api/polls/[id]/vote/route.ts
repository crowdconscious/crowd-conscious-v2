import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

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

    const { id: contentId } = await params
    const { optionId } = await request.json()

    if (!optionId) {
      return NextResponse.json(
        { error: 'Poll option ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerAuth()

    // Verify the content exists and is a poll
    const { data: content, error: contentError } = await (supabase as any)
      .from('community_content')
      .select('id, type, title')
      .eq('id', contentId)
      .eq('type', 'poll')
      .single()

    if (contentError || !content) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    // Verify the option belongs to this poll
    const { data: option, error: optionError } = await (supabase as any)
      .from('poll_options')
      .select('id, content_id')
      .eq('id', optionId)
      .eq('content_id', contentId)
      .single()

    if (optionError || !option) {
      return NextResponse.json(
        { error: 'Invalid poll option' },
        { status: 400 }
      )
    }

    // Insert or update the vote
    const { data: vote, error: voteError } = await (supabase as any)
      .from('poll_votes')
      .upsert({
        poll_option_id: optionId,
        user_id: (user as any).id,
        content_id: contentId
      }, {
        onConflict: 'user_id,content_id'
      })
      .select()

    if (voteError) {
      console.error('Error creating vote:', voteError)
      return NextResponse.json(
        { error: voteError.message || 'Failed to cast vote' },
        { status: 500 }
      )
    }

    // Get updated vote counts
    const { data: voteCounts, error: countError } = await (supabase as any)
      .from('poll_options')
      .select('id, option_text, vote_count')
      .eq('content_id', contentId)
      .order('id')

    if (countError) {
      console.error('Error fetching vote counts:', countError)
    }

    return NextResponse.json({
      success: true,
      message: 'Vote cast successfully',
      vote: vote,
      voteCounts: voteCounts || []
    }, { status: 200 })

  } catch (error: any) {
    console.error('API error casting vote:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { id: contentId } = await params
    const supabase = await createServerAuth()

    // Delete the user's vote
    const { error: deleteError } = await (supabase as any)
      .from('poll_votes')
      .delete()
      .eq('user_id', (user as any).id)
      .eq('content_id', contentId)

    if (deleteError) {
      console.error('Error deleting vote:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove vote' },
        { status: 500 }
      )
    }

    // Get updated vote counts
    const { data: voteCounts, error: countError } = await (supabase as any)
      .from('poll_options')
      .select('id, option_text, vote_count')
      .eq('content_id', contentId)
      .order('id')

    return NextResponse.json({
      success: true,
      message: 'Vote removed successfully',
      voteCounts: voteCounts || []
    }, { status: 200 })

  } catch (error: any) {
    console.error('API error removing vote:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
