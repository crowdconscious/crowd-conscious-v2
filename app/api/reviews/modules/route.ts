import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Fetch reviews for a module
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ reviews: [] }, { status: 200 })
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

    return NextResponse.json({ reviews: reviewsWithProfiles }, { status: 200 })
  } catch (error: any) {
    console.error('Error in reviews API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new review
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moduleId, rating, title, review_text, would_recommend } = body

    if (!moduleId || !rating) {
      return NextResponse.json({ error: 'moduleId and rating required' }, { status: 400 })
    }

    // Verify user is enrolled in this module
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, completed')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (!enrollment) {
      return NextResponse.json({ error: 'Must be enrolled to review' }, { status: 403 })
    }

    // Create review (without JOIN to avoid FK issues)
    const { data: review, error } = await supabase
      .from('module_reviews')
      .insert({
        module_id: moduleId,
        user_id: user.id,
        rating,
        title: title || null,
        review_text: review_text || null,
        would_recommend: would_recommend !== false,
        completion_status: enrollment.completed ? 'completed' : 'in_progress',
        is_verified_purchase: true
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate review error
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya has dejado una reseña para este módulo' }, { status: 409 })
      }
      console.error('❌ Error creating review:', error)
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to create review', 
        details: error.message 
      }, { status: 500 })
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

    return NextResponse.json({ review: reviewWithProfile }, { status: 201 })
  } catch (error: any) {
    console.error('Error in create review API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update existing review
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reviewId, rating, title, review_text, would_recommend } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
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

    return NextResponse.json({ review: reviewWithProfile }, { status: 200 })
  } catch (error: any) {
    console.error('Error in update review API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete review
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('module_reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting review:', error)
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Review deleted' }, { status: 200 })
  } catch (error: any) {
    console.error('Error in delete review API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
