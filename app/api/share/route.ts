import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, contentType } = body

    if (!contentId || !contentType) {
      return ApiResponse.badRequest('Content ID and type are required', 'MISSING_REQUIRED_FIELDS')
    }

    const supabase = await createServerAuth()
    
    // Get current user (optional - can share without login)
    const { data: { user } } = await supabase.auth.getUser()

    // Generate the public share URL (no token needed)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
    const shareUrl = `${baseUrl}/share/content/${contentId}`

    // Track the share action if user is logged in
    if (user) {
      const { error: trackError } = await supabase
        .from('content_shares')
        .insert({
          content_id: contentId,
          user_id: user.id,
          platform: 'link', // Will be updated by client based on where they share
        })

      if (trackError) {
        console.error('Error tracking share:', trackError)
        // Don't fail the request if tracking fails
      }
    }

    return ApiResponse.ok({
      shareUrl,
      contentId,
      contentType,
    })
  } catch (error: any) {
    console.error('Error generating share link:', error)
    return ApiResponse.serverError('Failed to generate share link', 'SHARE_LINK_ERROR', { 
      message: error.message 
    })
  }
}

// Track share clicks (called when someone clicks a shared link)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    const referrer = searchParams.get('referrer')

    if (!contentId) {
      return ApiResponse.badRequest('Content ID is required', 'MISSING_CONTENT_ID')
    }

    const supabase = await createServerAuth()

    // Track the click
    const { error } = await supabase
      .from('share_clicks')
      .insert({
        content_id: contentId,
        referrer: referrer || request.headers.get('referer'),
      })

    if (error) {
      console.error('Error tracking share click:', error)
      // Don't fail the request if tracking fails
    }

    return ApiResponse.ok({ success: true })
  } catch (error: any) {
    console.error('Error tracking share click:', error)
    return ApiResponse.serverError('Failed to track share click', 'SHARE_CLICK_ERROR', { 
      message: error.message 
    })
  }
}

