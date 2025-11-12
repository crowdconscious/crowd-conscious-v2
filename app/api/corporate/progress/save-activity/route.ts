import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

// ⚠️ DEPRECATED: This endpoint is deprecated. Use /api/enrollments/[enrollmentId]/activities instead.
// This endpoint will be removed in a future version.
// Save activity data from reusable tools (calculators, evidence, reflections, etc.)
export async function POST(request: NextRequest) {
  console.warn('⚠️ DEPRECATED ENDPOINT: /api/corporate/progress/save-activity is deprecated. Use /api/enrollments/[enrollmentId]/activities instead.')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to save activity data', 'AUTHENTICATION_REQUIRED')
    }

    const body = await request.json()
    const {
      courseId,
      moduleId,
      lessonId,
      activityType, // 'carbon', 'cost', 'evidence', 'reflection', 'impact'
      activityData
    } = body

    console.log('💾 Saving activity data:', {
      user: user.id,
      moduleId,
      lessonId,
      activityType
    })

    // ✅ Get enrollment_id for this user and module
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (!enrollment) {
      return ApiResponse.notFound('Enrollment', 'ENROLLMENT_NOT_FOUND')
    }

    // Check if response exists
    const { data: existing } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('lesson_id', lessonId)
      .single()

    // Prepare update data based on activity type
    let updateData: any = {
      enrollment_id: enrollment.id,
      lesson_id: lessonId,
      module_id: moduleId,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      // Update existing record
      switch (activityType) {
        case 'carbon':
          updateData.carbon_data = activityData
          break
        case 'cost':
          updateData.cost_data = activityData
          break
        case 'evidence':
          // Merge with existing evidence URLs
          const existingUrls = existing.evidence_urls || []
          updateData.evidence_urls = [...existingUrls, ...activityData.urls]
          break
        case 'reflection':
          updateData.reflection = activityData.text || ''
          updateData.responses = {
            ...existing.responses,
            reflection_journal: activityData
          }
          break
        case 'impact':
          updateData.impact_comparisons = activityData
          break
        case 'general':
          // General activity responses
          updateData.responses = {
            ...existing.responses,
            ...activityData
          }
          break
        default:
          // Store in responses JSONB
          updateData.responses = {
            ...existing.responses,
            [activityType]: activityData
          }
      }

      const { data, error } = await supabase
        .from('lesson_responses')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating activity:', error)
        return ApiResponse.serverError('Failed to update activity', 'ACTIVITY_UPDATE_ERROR', { message: error.message })
      }

      console.log('✅ Activity updated:', data.id)
      return ApiResponse.ok({ 
        responseId: data.id,
        message: 'Activity data saved successfully'
      })
    } else {
      // Create new record
      updateData.created_at = new Date().toISOString()
      
      switch (activityType) {
        case 'carbon':
          updateData.carbon_data = activityData
          break
        case 'cost':
          updateData.cost_data = activityData
          break
        case 'evidence':
          updateData.evidence_urls = activityData.urls
          break
        case 'reflection':
          updateData.reflection = activityData.text || ''
          updateData.responses = {
            reflection_journal: activityData
          }
          break
        case 'impact':
          updateData.impact_comparisons = activityData
          break
        case 'general':
          updateData.responses = activityData
          break
        default:
          updateData.responses = {
            [activityType]: activityData
          }
      }

      const { data, error } = await supabase
        .from('lesson_responses')
        .insert(updateData)
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating activity:', error)
        return ApiResponse.serverError('Failed to create activity', 'ACTIVITY_CREATION_ERROR', { message: error.message })
      }

      console.log('✅ Activity created:', data.id)
      return ApiResponse.ok({ 
        responseId: data.id,
        message: 'Activity data saved successfully'
      })
    }
  } catch (error: any) {
    console.error('❌ Error in save-activity:', error)
    return ApiResponse.serverError('Internal server error', 'SAVE_ACTIVITY_SERVER_ERROR', { message: error.message })
  }
}

// Get saved activity data for a lesson
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to retrieve activity data', 'AUTHENTICATION_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const lessonId = searchParams.get('lessonId')

    if (!moduleId || !lessonId) {
      return ApiResponse.badRequest('Missing required parameters: moduleId, lessonId', 'MISSING_REQUIRED_PARAMS')
    }

    // ✅ Get enrollment_id for this user and module
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (!enrollment) {
      return ApiResponse.notFound('Enrollment', 'ENROLLMENT_NOT_FOUND')
    }

    const { data, error } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('lesson_id', lessonId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      return ApiResponse.serverError('Failed to retrieve activity data', 'ACTIVITY_FETCH_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ 
      data: data || null 
    })
  } catch (error: any) {
    console.error('❌ Error in get activity:', error)
    return ApiResponse.serverError('Internal server error', 'GET_ACTIVITY_SERVER_ERROR', { message: error.message })
  }
}

