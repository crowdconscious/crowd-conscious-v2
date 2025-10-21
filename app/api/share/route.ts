import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, contentType } = body

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: 'Content ID and type are required' },
        { status: 400 }
      )
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

    return NextResponse.json({
      success: true,
      shareUrl,
      contentId,
      contentType,
    })
  } catch (error) {
    console.error('Error generating share link:', error)
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    )
  }
}

// Track share clicks (called when someone clicks a shared link)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    const referrer = searchParams.get('referrer')

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
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
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking share click:', error)
    return NextResponse.json(
      { error: 'Failed to track share click' },
      { status: 500 }
    )
  }
}

