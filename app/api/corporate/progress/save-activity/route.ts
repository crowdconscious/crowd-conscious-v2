import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Save activity data from reusable tools (calculators, evidence, reflections, etc.)
export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      courseId,
      moduleId,
      lessonId,
      activityType
    })

    // Get employee's corporate account
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, is_corporate_user')
      .eq('id', user.id)
      .single()

    if (!profile?.is_corporate_user || !profile.corporate_account_id) {
      return NextResponse.json({ error: 'Not a corporate user' }, { status: 403 })
    }

    // Check if response exists
    const { data: existing } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('employee_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .eq('lesson_id', lessonId)
      .single()

    // Prepare update data based on activity type
    let updateData: any = {
      employee_id: user.id,
      corporate_account_id: profile.corporate_account_id,
      course_id: courseId,
      module_id: moduleId,
      lesson_id: lessonId,
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
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Activity updated:', data.id)
      return NextResponse.json({ 
        success: true, 
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
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Activity created:', data.id)
      return NextResponse.json({ 
        success: true, 
        responseId: data.id,
        message: 'Activity data saved successfully'
      })
    }
  } catch (error) {
    console.error('❌ Error in save-activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get saved activity data for a lesson
export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const moduleId = searchParams.get('moduleId')
    const lessonId = searchParams.get('lessonId')

    if (!courseId || !moduleId || !lessonId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('employee_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .eq('lesson_id', lessonId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: data || null 
    })
  } catch (error) {
    console.error('❌ Error in get activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

