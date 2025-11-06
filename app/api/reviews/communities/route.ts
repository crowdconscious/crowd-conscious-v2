import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET: Fetch reviews for a community
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('communityId')

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch reviews with user profile data
    const { data: reviews, error } = await supabase
      .from('community_reviews')
      .select(`
        *,
        user:user_id (
          id,
          profiles (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('community_id', communityId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching community reviews:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new community review
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      communityId, 
      rating, 
      title, 
      reviewText, 
      wouldRecommend,
      impactRating,
      transparencyRating,
      communicationRating,
      memberStatus 
    } = body

    // Validate required fields
    if (!communityId || !rating) {
      return NextResponse.json({ error: 'Community ID and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user is a member of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single()

    if (!membership) {
      return NextResponse.json({ 
        error: 'You must be a member of this community to leave a review' 
      }, { status: 403 })
    }

    // Check if user already reviewed this community
    const { data: existingReview } = await supabase
      .from('community_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single()

    if (existingReview) {
      return NextResponse.json({ 
        error: 'You have already reviewed this community. You can edit your existing review.' 
      }, { status: 409 })
    }

    // Create review
    const { data: review, error: insertError } = await supabase
      .from('community_reviews')
      .insert({
        community_id: communityId,
        user_id: user.id,
        rating: rating,
        title: title || null,
        review_text: reviewText || null,
        would_recommend: wouldRecommend !== undefined ? wouldRecommend : true,
        impact_rating: impactRating || null,
        transparency_rating: transparencyRating || null,
        communication_rating: communicationRating || null,
        member_status: memberStatus || 'current_member',
        is_verified_member: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating review:', insertError)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update an existing review
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      reviewId, 
      rating, 
      title, 
      reviewText, 
      wouldRecommend,
      impactRating,
      transparencyRating,
      communicationRating 
    } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    // Update review
    const { data: review, error } = await supabase
      .from('community_reviews')
      .update({
        rating: rating,
        title: title,
        review_text: reviewText,
        would_recommend: wouldRecommend,
        impact_rating: impactRating,
        transparency_rating: transparencyRating,
        communication_rating: communicationRating,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating review:', error)
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a review
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('community_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting review:', error)
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Review deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

