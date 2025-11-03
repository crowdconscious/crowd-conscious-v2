import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { templateId, communityId } = await request.json()

    if (!templateId || !communityId) {
      return NextResponse.json(
        { error: 'Template ID and Community ID are required' },
        { status: 400 }
      )
    }

    // Verify user is admin/founder of the community
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'founder' && membership.role !== 'admin')) {
      return NextResponse.json(
        { error: 'You must be a community admin to clone templates' },
        { status: 403 }
      )
    }

    // Fetch the template module
    const { data: template, error: templateError } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Fetch template lessons
    const { data: templateLessons, error: lessonsError } = await supabase
      .from('module_lessons')
      .select('*')
      .eq('module_id', templateId)
      .order('lesson_order', { ascending: true })

    if (lessonsError) {
      console.error('Error fetching template lessons:', lessonsError)
    }

    // Fetch community name
    const { data: communityData } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single()

    // Create new module (clone)
    const slug = `${template.slug}-clone-${Date.now()}`
    
    const { data: newModule, error: moduleError } = await (supabase as any)
      .from('marketplace_modules')
      .insert({
        title: `${template.title} (Copia)`,
        description: template.description,
        slug,
        creator_community_id: communityId,
        creator_user_id: user.id,
        creator_name: communityData?.name || 'Community',
        core_value: template.core_value,
        difficulty_level: template.difficulty_level,
        estimated_duration_hours: template.estimated_duration_hours,
        xp_reward: template.xp_reward,
        thumbnail_url: template.thumbnail_url,
        industry_tags: template.industry_tags || [],
        base_price_mxn: 18000, // Default price for cloned modules
        price_per_50_employees: 8000,
        status: 'draft', // Cloned modules start as draft
        is_platform_module: false,
        featured: false,
        lesson_count: templateLessons?.length || 0,
        purchase_count: 0,
        enrollment_count: 0,
        avg_rating: 0,
        review_count: 0
      })
      .select()
      .single()

    if (moduleError) {
      console.error('Error creating cloned module:', moduleError)
      return NextResponse.json(
        { error: 'Failed to clone module', details: moduleError.message },
        { status: 500 }
      )
    }

    // Clone lessons
    if (templateLessons && templateLessons.length > 0) {
      const clonedLessons = templateLessons.map((lesson: any) => ({
        module_id: newModule.id,
        lesson_order: lesson.lesson_order,
        title: lesson.title,
        description: lesson.description,
        estimated_minutes: lesson.estimated_minutes,
        xp_reward: lesson.xp_reward,
        story_content: lesson.story_content,
        learning_objectives: lesson.learning_objectives,
        key_points: lesson.key_points,
        did_you_know: lesson.did_you_know,
        real_world_example: lesson.real_world_example,
        activity_type: lesson.activity_type,
        activity_config: lesson.activity_config,
        activity_required: lesson.activity_required,
        tools_used: lesson.tools_used,
        resources: lesson.resources,
        next_steps: lesson.next_steps
      }))

      const { error: cloneLessonsError } = await (supabase as any)
        .from('module_lessons')
        .insert(clonedLessons)

      if (cloneLessonsError) {
        console.error('Error cloning lessons:', cloneLessonsError)
        // Don't fail the request, lessons can be added later
      }
    }

    return NextResponse.json({
      success: true,
      module: {
        id: newModule.id,
        slug: newModule.slug,
        title: newModule.title,
        lessonCount: templateLessons?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in POST /api/modules/clone-template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

