import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

// POST /api/user/modules/create - Create module as individual creator
export async function POST(request: Request) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to create modules')
    }

    const adminClient = createAdminClient()
    const moduleData = await request.json()
    
    console.log('📝 Creating module for user:', user.id)
    console.log('📊 Module data:', { title: moduleData.title, status: moduleData.status })

    // Ensure user wallet exists
    const { data: walletData, error: walletError } = await adminClient
      .rpc('ensure_user_wallet', { p_user_id: user.id })
    
    if (walletError) {
      console.warn('⚠️ Wallet creation warning:', walletError)
      // Don't fail the module creation if wallet fails
    } else {
      console.log('✅ User wallet ensured:', walletData)
    }

    // Generate slug from title
    const slug = moduleData.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now()

    // Insert module
    const { data: module, error: moduleError } = await adminClient
      .from('marketplace_modules')
      .insert({
        creator_id: user.id,
        creator_community_id: null, // Individual creator (not community)
        title: moduleData.title,
        slug: slug,
        description: moduleData.description,
        core_value: moduleData.coreValue,
        difficulty_level: moduleData.difficulty,
        estimated_duration_hours: moduleData.estimatedHours,
        xp_reward: moduleData.xpReward,
        thumbnail_url: moduleData.thumbnailUrl || null,
        industry_tags: moduleData.industryTags || [],
        base_price_mxn: moduleData.basePriceMxn,
        price_per_50_employees: moduleData.pricePer50,
        status: moduleData.status, // 'draft' or 'pending_review'
        is_platform_module: false,
        price_set_by_community: false // Price set by individual creator
      })
      .select()
      .single()
    
    if (moduleError) {
      console.error('❌ Error creating module:', moduleError)
      throw moduleError
    }

    console.log('✅ Module created:', module.id)

    // Insert lessons
    if (moduleData.lessons && moduleData.lessons.length > 0) {
      const lessonsToInsert = moduleData.lessons.map((lesson: any, index: number) => ({
        module_id: module.id,
        lesson_number: index + 1,
        title: lesson.title,
        content: lesson.description,
        estimated_minutes: lesson.estimatedMinutes,
        xp_reward: lesson.xpReward,
        key_points: lesson.keyPoints.filter((kp: string) => kp.trim() !== ''),
        video_url: null,
        resources: lesson.resources || []
      }))

      const { error: lessonsError } = await adminClient
        .from('module_lessons')
        .insert(lessonsToInsert)

      if (lessonsError) {
        console.error('❌ Error creating lessons:', lessonsError)
        // Don't throw - module was created, just lessons failed
      } else {
        console.log(`✅ Created ${lessonsToInsert.length} lesson(s)`)
      }
    }

    return ApiResponse.created({
      message: moduleData.status === 'draft' 
        ? 'Module saved as draft' 
        : 'Module submitted for review',
      module: {
        id: module.id,
        title: module.title,
        slug: module.slug,
        status: module.status
      }
    })
  } catch (error) {
    console.error('💥 Error in POST /api/user/modules/create:', error)
    return ApiResponse.serverError('Failed to create module')
  }
}

