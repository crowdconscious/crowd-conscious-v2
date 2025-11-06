import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// GET: Fetch reviews for a module
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch reviews with user profile data
    const { data: reviews, error } = await supabase
      .from('module_reviews')
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
      .eq('module_id', moduleId)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching module reviews:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new review
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moduleId, rating, title, reviewText, wouldRecommend, completionStatus } = body

    // Validate required fields
    if (!moduleId || !rating) {
      return NextResponse.json({ error: 'Module ID and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user is enrolled in this module
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id, completed')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'You must be enrolled in this module to leave a review' 
      }, { status: 403 })
    }

    // Check if user already reviewed this module
    const { data: existingReview } = await supabase
      .from('module_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (existingReview) {
      return NextResponse.json({ 
        error: 'You have already reviewed this module. You can edit your existing review.' 
      }, { status: 409 })
    }

    // Create review
    const { data: review, error: insertError } = await supabase
      .from('module_reviews')
      .insert({
        module_id: moduleId,
        user_id: user.id,
        rating: rating,
        title: title || null,
        review_text: reviewText || null,
        would_recommend: wouldRecommend !== undefined ? wouldRecommend : true,
        completion_status: completionStatus || (enrollment.completed ? 'completed' : 'in_progress'),
        is_verified_purchase: true // They're enrolled, so it's verified
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
    const { reviewId, rating, title, reviewText, wouldRecommend } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
    }

    // Update review (RLS ensures they can only update their own)
    const { data: review, error } = await supabase
      .from('module_reviews')
      .update({
        rating: rating,
        title: title,
        review_text: reviewText,
        would_recommend: wouldRecommend,
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
      .from('module_reviews')
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

