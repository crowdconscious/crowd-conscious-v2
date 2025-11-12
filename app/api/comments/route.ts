import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    
    if (!contentId) {
      return ApiResponse.badRequest('contentId is required', 'MISSING_CONTENT_ID')
    }

    const supabase = await createServerAuth()
    
    // Get comments with author info
    const { data: comments, error } = await (supabase as any)
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        parent_id,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return ApiResponse.serverError('Failed to fetch comments', 'COMMENTS_FETCH_ERROR', { message: error.message })
    }

    // Structure comments with replies
    const structuredComments = structureComments(comments || [])

    return ApiResponse.ok({ 
      comments: structuredComments,
      count: comments?.length || 0 
    })

  } catch (error: any) {
    console.error('Comments API error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMENTS_API_ERROR', { message: error.message })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Please log in to comment')
    }

    const { contentId, content, parentId } = await request.json()

    if (!contentId || !content?.trim()) {
      return ApiResponse.badRequest('contentId and content are required', 'MISSING_REQUIRED_FIELDS')
    }

    // Verify user is a member of the community (for content)
    const supabase = await createServerAuth()
    
    const { data: contentData, error: contentError } = await (supabase as any)
      .from('community_content')
      .select('community_id')
      .eq('id', contentId)
      .single()

    if (contentError || !contentData) {
      return ApiResponse.notFound('Content', 'CONTENT_NOT_FOUND')
    }

    // Check if user is a member of the community
    const { data: membership, error: membershipError } = await (supabase as any)
      .from('community_members')
      .select('id')
      .eq('community_id', contentData.community_id)
      .eq('user_id', (user as any).id)
      .single()

    if (membershipError || !membership) {
      return ApiResponse.forbidden('You must be a community member to comment', 'NOT_COMMUNITY_MEMBER')
    }

    // Create comment
    const { data: comment, error: commentError } = await (supabase as any)
      .from('comments')
      .insert({
        content_id: contentId,
        user_id: (user as any).id,
        content: content.trim(),
        parent_id: parentId || null
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        parent_id,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return ApiResponse.serverError('Failed to create comment', 'COMMENT_CREATION_ERROR', { message: commentError.message })
    }

    return ApiResponse.created({ 
      comment: comment 
    })

  } catch (error: any) {
    console.error('Comment creation error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMENT_CREATION_SERVER_ERROR', { message: error.message })
  }
}

// Helper function to structure comments with replies
function structureComments(comments: any[]): any[] {
  const commentMap = new Map()
  const rootComments: any[] = []

  // First pass: create comment objects
  comments.forEach(comment => {
    commentMap.set(comment.id, {
      ...comment,
      replies: []
    })
  })

  // Second pass: organize into tree structure
  comments.forEach(comment => {
    const commentObj = commentMap.get(comment.id)
    
    if (comment.parent_id) {
      // This is a reply
      const parent = commentMap.get(comment.parent_id)
      if (parent) {
        parent.replies.push(commentObj)
      }
    } else {
      // This is a root comment
      rootComments.push(commentObj)
    }
  })

  return rootComments
}
