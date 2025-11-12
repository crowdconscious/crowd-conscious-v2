import { createClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'

// GET: Fetch reviews for a community
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('communityId')

    if (!communityId) {
      return ApiResponse.badRequest('Community ID required', 'MISSING_COMMUNITY_ID')
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
      return ApiResponse.serverError('Failed to fetch reviews', 'COMMUNITY_REVIEWS_FETCH_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ reviews: reviews || [] })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMUNITY_REVIEWS_API_ERROR', { message: error.message })
  }
}

// POST: Create a new community review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to leave a review')
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
      return ApiResponse.badRequest('Community ID and rating are required', 'MISSING_REQUIRED_FIELDS')
    }

    if (rating < 1 || rating > 5) {
      return ApiResponse.badRequest('Rating must be between 1 and 5', 'INVALID_RATING')
    }

    // Check if user is a member of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single()

    if (!membership) {
      return ApiResponse.forbidden('You must be a member of this community to leave a review', 'NOT_COMMUNITY_MEMBER')
    }

    // Check if user already reviewed this community
    const { data: existingReview } = await supabase
      .from('community_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .single()

    if (existingReview) {
      return ApiResponse.conflict('You have already reviewed this community. You can edit your existing review.', 'DUPLICATE_REVIEW')
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
      return ApiResponse.serverError('Failed to create review', 'COMMUNITY_REVIEW_CREATION_ERROR', { message: insertError.message })
    }

    return ApiResponse.created({ review })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMUNITY_REVIEW_CREATION_SERVER_ERROR', { message: error.message })
  }
}

// PUT: Update an existing review
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to update your review')
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
      return ApiResponse.badRequest('Review ID required', 'MISSING_REVIEW_ID')
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
      return ApiResponse.serverError('Failed to update review', 'COMMUNITY_REVIEW_UPDATE_ERROR', { message: error.message })
    }

    if (!review) {
      return ApiResponse.notFound('Review', 'REVIEW_NOT_FOUND')
    }

    return ApiResponse.ok({ review })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMUNITY_REVIEW_UPDATE_SERVER_ERROR', { message: error.message })
  }
}

// DELETE: Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to delete your review')
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return ApiResponse.badRequest('Review ID required', 'MISSING_REVIEW_ID')
    }

    const { error } = await supabase
      .from('community_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting review:', error)
      return ApiResponse.serverError('Failed to delete review', 'COMMUNITY_REVIEW_DELETE_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ message: 'Review deleted successfully' })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return ApiResponse.serverError('Internal server error', 'COMMUNITY_REVIEW_DELETE_SERVER_ERROR', { message: error.message })
  }
}

