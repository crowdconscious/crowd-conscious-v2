import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const body = await request.json()

    const {
      title,
      description,
      coreValue,
      difficulty,
      estimatedHours,
      xpReward,
      thumbnailUrl,
      industryTags,
      basePriceMxn,
      pricePer50,
      lessons,
      isPlatformModule = true, // Default to platform module
      featured = true
    } = body

    // Generate slug
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Create the module
    const { data: module, error: moduleError } = await (supabase as any)
      .from('marketplace_modules')
      .insert({
        title,
        description,
        slug: `${slug}-${Date.now()}`,
        creator_community_id: null, // Platform modules have no community
        creator_user_id: null, // Platform modules have no user creator
        creator_name: 'Crowd Conscious Platform',
        core_value: coreValue,
        difficulty_level: difficulty,
        estimated_duration_hours: estimatedHours,
        xp_reward: xpReward,
        thumbnail_url: thumbnailUrl || null,
        industry_tags: industryTags || [],
        base_price_mxn: basePriceMxn,
        price_per_50_employees: pricePer50,
        status: 'published', // Platform modules are published immediately
        is_platform_module: isPlatformModule,
        featured: featured,
        published_at: new Date().toISOString(),
        lesson_count: lessons?.length || 0,
        purchase_count: 0,
        enrollment_count: 0,
        avg_rating: 0,
        review_count: 0
      })
      .select()
      .single()

    if (moduleError) {
      console.error('Error creating platform module:', moduleError)
      return NextResponse.json(
        { error: 'Failed to create module', details: moduleError.message },
        { status: 500 }
      )
    }

    // Create lessons if provided
    if (lessons && lessons.length > 0) {
      const lessonsData = lessons.map((lesson: any, index: number) => ({
        module_id: module.id,
        lesson_order: index + 1,
        title: lesson.title,
        description: lesson.description || '',
        estimated_minutes: lesson.estimatedMinutes || 30,
        xp_reward: lesson.xpReward || 10,
        story_content: lesson.storyContent || null,
        learning_objectives: lesson.learningObjectives || [],
        key_points: lesson.keyPoints || [],
        did_you_know: lesson.didYouKnow || [],
        real_world_example: lesson.realWorldExample || null,
        activity_type: lesson.activityType || 'reading',
        activity_config: lesson.activityConfig || {},
        activity_required: lesson.activityRequired !== false,
        tools_used: lesson.toolsUsed || [],
        resources: lesson.resources || [],
        next_steps: lesson.nextSteps || []
      }))

      const { error: lessonsError } = await (supabase as any)
        .from('module_lessons')
        .insert(lessonsData)

      if (lessonsError) {
        console.error('Error creating lessons:', lessonsError)
        // Don't fail the request, lessons can be added later
      }
    }

    return NextResponse.json({
      success: true,
      module: {
        id: module.id,
        slug: module.slug,
        title: module.title,
        lessonCount: lessons?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in POST /api/admin/modules/import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

