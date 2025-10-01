import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    
    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Structure comments with replies
    const structuredComments = structureComments(comments || [])

    return NextResponse.json({ 
      comments: structuredComments,
      count: comments?.length || 0 
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Comments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { contentId, content, parentId } = await request.json()

    if (!contentId || !content?.trim()) {
      return NextResponse.json(
        { error: 'contentId and content are required' },
        { status: 400 }
      )
    }

    // Verify user is a member of the community (for content)
    const supabase = await createServerAuth()
    
    const { data: contentData, error: contentError } = await (supabase as any)
      .from('community_content')
      .select('community_id')
      .eq('id', contentId)
      .single()

    if (contentError || !contentData) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check if user is a member of the community
    const { data: membership, error: membershipError } = await (supabase as any)
      .from('community_members')
      .select('id')
      .eq('community_id', contentData.community_id)
      .eq('user_id', (user as any).id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You must be a community member to comment' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      comment: comment 
    }, { status: 201 })

  } catch (error) {
    console.error('Comment creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
