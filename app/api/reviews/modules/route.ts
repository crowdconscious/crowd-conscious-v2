import { createClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'

export const dynamic = 'force-dynamic'

// GET: Fetch reviews for a module
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return ApiResponse.badRequest('moduleId required', 'MISSING_MODULE_ID')
    }

    const supabase = await createClient()

    // Fetch reviews (without JOIN to avoid FK issues)
    const { data: reviews, error } = await supabase
      .from('module_reviews')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching reviews:', error)
      return ApiResponse.serverError('Failed to fetch reviews', 'REVIEWS_FETCH_ERROR', { message: error.message })
    }

    if (!reviews || reviews.length === 0) {
      return ApiResponse.ok({ reviews: [] })
    }

    // Fetch profile data for all reviewers separately
    const userIds = [...new Set(reviews.map(r => r.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    // Create a profile map for quick lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Combine reviews with profile data
    const reviewsWithProfiles = reviews.map(review => ({
      ...review,
      profiles: profileMap.get(review.user_id) || { 
        full_name: 'Usuario', 
        avatar_url: null 
      }
    }))

    return ApiResponse.ok({ reviews: reviewsWithProfiles })
  } catch (error: any) {
    console.error('Error in reviews API:', error)
    return ApiResponse.serverError('Internal server error', 'REVIEWS_API_ERROR', { message: error.message })
  }
}

// POST: Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to leave a review')
    }

    const body = await request.json()
    const { moduleId, rating, title, review_text, reviewText, would_recommend, wouldRecommend, completion_status, completionStatus } = body
    
    // Support both snake_case and camelCase
    const finalReviewText = review_text || reviewText
    const finalWouldRecommend = would_recommend !== undefined ? would_recommend : (wouldRecommend !== undefined ? wouldRecommend : true)
    const finalCompletionStatus = completion_status || completionStatus || 'completed'

    if (!moduleId || !rating) {
      return ApiResponse.badRequest('moduleId and rating required', 'MISSING_REQUIRED_FIELDS')
    }

    // Verify user is enrolled in this module
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, completed')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (!enrollment) {
      return ApiResponse.forbidden('Must be enrolled to review', 'NOT_ENROLLED')
    }

    // Create review (without JOIN to avoid FK issues)
    const { data: review, error } = await supabase
      .from('module_reviews')
      .insert({
        module_id: moduleId,
        user_id: user.id,
        rating,
        title: title || null,
        review_text: finalReviewText || null,
        would_recommend: finalWouldRecommend,
        completion_status: finalCompletionStatus,
        is_verified_purchase: true
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate review error
      if (error.code === '23505') {
        return ApiResponse.conflict('Ya has dejado una reseña para este módulo', 'DUPLICATE_REVIEW')
      }
      console.error('❌ Error creating review:', error)
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return ApiResponse.serverError('Failed to create review', 'REVIEW_CREATION_ERROR', { message: error.message })
    }

    // Fetch profile data separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()

    // Combine review with profile data
    const reviewWithProfile = {
      ...review,
      profiles: profile || { full_name: user.email, avatar_url: null }
    }

    return ApiResponse.created({ review: reviewWithProfile })
  } catch (error: any) {
    console.error('Error in create review API:', error)
    return ApiResponse.serverError('Internal server error', 'REVIEW_CREATION_SERVER_ERROR', { message: error.message })
  }
}

// PUT: Update existing review
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to update your review')
    }

    const body = await request.json()
    const { reviewId, rating, title, review_text, would_recommend } = body

    if (!reviewId) {
      return ApiResponse.badRequest('reviewId required', 'MISSING_REVIEW_ID')
    }

    const { data: review, error } = await supabase
      .from('module_reviews')
      .update({
        rating: rating !== undefined ? rating : undefined,
        title: title !== undefined ? title : undefined,
        review_text: review_text !== undefined ? review_text : undefined,
        would_recommend: would_recommend !== undefined ? would_recommend : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating review:', error)
      return ApiResponse.serverError('Failed to update review', 'REVIEW_UPDATE_ERROR', { message: error.message })
    }

    if (!review) {
      return ApiResponse.notFound('Review', 'REVIEW_NOT_FOUND')
    }

    // Fetch profile data separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()

    // Combine review with profile data
    const reviewWithProfile = {
      ...review,
      profiles: profile || { full_name: user.email, avatar_url: null }
    }

    return ApiResponse.ok({ review: reviewWithProfile })
  } catch (error: any) {
    console.error('Error in update review API:', error)
    return ApiResponse.serverError('Internal server error', 'REVIEW_UPDATE_SERVER_ERROR', { message: error.message })
  }
}

// DELETE: Delete review
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to delete your review')
    }

    const searchParams = request.nextUrl.searchParams
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return ApiResponse.badRequest('reviewId required', 'MISSING_REVIEW_ID')
    }

    const { error } = await supabase
      .from('module_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting review:', error)
      return ApiResponse.serverError('Failed to delete review', 'REVIEW_DELETE_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ message: 'Review deleted' })
  } catch (error: any) {
    console.error('Error in delete review API:', error)
    return ApiResponse.serverError('Internal server error', 'REVIEW_DELETE_SERVER_ERROR', { message: error.message })
  }
}
