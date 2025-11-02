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
      communityId,
      userId,
      status
    } = body

    // Validate community membership
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single()

    if (!membership || (membership.role !== 'founder' && membership.role !== 'admin')) {
      return NextResponse.json(
        { error: 'You must be a community admin to create modules' },
        { status: 403 }
      )
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
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
        slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
        creator_community_id: communityId,
        creator_user_id: userId,
        creator_name: membership.role === 'founder' ? 'Community Founder' : 'Community Admin',
        core_value: coreValue,
        difficulty_level: difficulty,
        estimated_duration_hours: estimatedHours,
        xp_reward: xpReward,
        thumbnail_url: thumbnailUrl || null,
        industry_tags: industryTags || [],
        base_price_mxn: basePriceMxn,
        price_per_50_employees: pricePer50,
        status: status || 'draft',
        purchase_count: 0,
        enrollment_count: 0,
        avg_rating: 0,
        review_count: 0
      })
      .select()
      .single()

    if (moduleError) {
      console.error('Error creating module:', moduleError)
      return NextResponse.json(
        { error: 'Failed to create module', details: moduleError.message },
        { status: 500 }
      )
    }

    // Create lessons if any
    if (lessons && lessons.length > 0) {
      const lessonsData = lessons.map((lesson: any, index: number) => ({
        module_id: module.id,
        lesson_number: index + 1,
        title: lesson.title,
        description: lesson.description,
        estimated_minutes: lesson.estimatedMinutes,
        xp_reward: lesson.xpReward,
        story_intro: lesson.storyIntro || null,
        key_points: lesson.keyPoints.filter((p: string) => p.trim() !== ''),
        activity_type: lesson.activityType || 'reflection',
        tools_used: lesson.toolsUsed || [],
        resources: lesson.resources || []
      }))

      const { error: lessonsError } = await (supabase as any)
        .from('module_lessons')
        .insert(lessonsData)

      if (lessonsError) {
        console.error('Error creating lessons:', lessonsError)
        // Don't fail the entire request, just log the error
        // Module is created, lessons can be added later
      }
    }

    return NextResponse.json({
      success: true,
      module: {
        id: module.id,
        slug: module.slug,
        status: module.status
      }
    })
  } catch (error) {
    console.error('Error in POST /api/modules/create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

