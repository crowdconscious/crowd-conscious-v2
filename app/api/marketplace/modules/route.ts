import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Use service role key to bypass RLS for public marketplace view
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔍 API: Starting module fetch...')
    
    // Fetch all published modules (exclude templates)
    const { data: modules, error } = await supabase
      .from('marketplace_modules')
      .select(`
        id,
        title,
        description,
        slug,
        core_value,
        difficulty_level,
        creator_name,
        base_price_mxn,
        individual_price_mxn,
        price_per_50_employees,
        is_template,
        estimated_duration_hours,
        lesson_count,
        xp_reward,
        avg_rating,
        review_count,
        enrollment_count,
        featured,
        is_platform_module,
        thumbnail_url,
        created_at
      `)
      .eq('status', 'published')
      .eq('is_template', false)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ API: Supabase error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      return NextResponse.json({ 
        error: 'Failed to fetch modules',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('✅ API: Modules fetched:', modules?.length || 0)

    // Transform to match frontend format
    const transformedModules = (modules || []).map((module: any) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      slug: module.slug,
      coreValue: module.core_value,
      difficulty: module.difficulty_level,
      creator: module.creator_name,
      creatorAvatar: getCoreValueIcon(module.core_value),
      rating: module.avg_rating || 0,
      reviewCount: module.review_count || 0,
      enrollments: module.enrollment_count || 0,
      duration: module.estimated_duration_hours,
      price: module.base_price_mxn,
      // Show individual price prominently
      individualPrice: module.individual_price_mxn || 360,
      pricePer50: module.price_per_50_employees,
      featured: module.featured,
      isPlatformModule: module.is_platform_module,
      thumbnailUrl: module.thumbnail_url,
      lessonCount: module.lesson_count,
      xpReward: module.xp_reward
    }))

    return NextResponse.json({ modules: transformedModules })
  } catch (error) {
    console.error('Error in GET /api/marketplace/modules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getCoreValueIcon(coreValue: string): string {
  const icons: Record<string, string> = {
    clean_air: '🌬️',
    clean_water: '💧',
    safe_cities: '🏙️',
    zero_waste: '♻️',
    fair_trade: '🤝',
    biodiversity: '🌱'
  }
  return icons[coreValue] || '🌟'
}

