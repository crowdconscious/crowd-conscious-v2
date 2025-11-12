import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { id: contentId } = await params
    const { optionId } = await request.json()

    if (!optionId) {
      return ApiResponse.badRequest('Poll option ID is required', 'MISSING_OPTION_ID')
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
      return ApiResponse.notFound('Poll', 'POLL_NOT_FOUND')
    }

    // Verify the option belongs to this poll
    const { data: option, error: optionError } = await (supabase as any)
      .from('poll_options')
      .select('id, content_id')
      .eq('id', optionId)
      .eq('content_id', contentId)
      .single()

    if (optionError || !option) {
      return ApiResponse.badRequest('Invalid poll option', 'INVALID_POLL_OPTION')
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
      return ApiResponse.serverError('Failed to cast vote', 'VOTE_CREATION_ERROR', { 
        message: voteError.message 
      })
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

    return ApiResponse.ok({
      message: 'Vote cast successfully',
      vote: vote,
      voteCounts: voteCounts || []
    })

  } catch (error: any) {
    console.error('API error casting vote:', error)
    return ApiResponse.serverError('Internal server error', 'VOTE_SERVER_ERROR', { 
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
      return ApiResponse.serverError('Failed to remove vote', 'VOTE_DELETE_ERROR', { 
        message: deleteError.message 
      })
    }

    // Get updated vote counts
    const { data: voteCounts, error: countError } = await (supabase as any)
      .from('poll_options')
      .select('id, option_text, vote_count')
      .eq('content_id', contentId)
      .order('id')

    return ApiResponse.ok({
      message: 'Vote removed successfully',
      voteCounts: voteCounts || []
    })

  } catch (error: any) {
    console.error('API error removing vote:', error)
    return ApiResponse.serverError('Internal server error', 'VOTE_DELETE_SERVER_ERROR', { 
      message: error.message 
    })
  }
}
