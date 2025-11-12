import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Fetch all published modules with creator info
    const { data: modules, error: modulesError } = await supabase
      .from('marketplace_modules')
      .select(`
        id,
        title,
        description,
        slug,
        core_value,
        difficulty_level,
        estimated_duration_hours,
        base_price_mxn,
        individual_price_mxn,
        featured,
        thumbnail_url,
        creator_name,
        creator_community_id,
        created_at,
        communities (
          id,
          name,
          logo_url
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (modulesError) {
      console.error('Error fetching modules:', modulesError)
      return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }

    // ✅ FIXED: Batch fetch all enrollment counts and reviews in single queries
    const moduleIds = (modules || []).map(m => m.id)
    
    // Get all enrollment counts at once
    const { data: enrollmentCounts, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('module_id')
      .in('module_id', moduleIds)
    
    // Count enrollments per module
    const enrollmentMap = new Map<string, number>()
    enrollmentCounts?.forEach(e => {
      enrollmentMap.set(e.module_id, (enrollmentMap.get(e.module_id) || 0) + 1)
    })
    
    // Get all reviews at once
    const { data: allReviews, error: reviewsError } = await supabase
      .from('module_reviews')
      .select('module_id, rating')
      .in('module_id', moduleIds)
    
    // Calculate review stats per module
    const reviewMap = new Map<string, { count: number; totalRating: number }>()
    allReviews?.forEach(r => {
      const existing = reviewMap.get(r.module_id) || { count: 0, totalRating: 0 }
      reviewMap.set(r.module_id, {
        count: existing.count + 1,
        totalRating: existing.totalRating + r.rating
      })
    })
    
    // Get creator avatar (emoji based on core value)
    const coreValueEmojis: Record<string, string> = {
      clean_air: '🌬️',
      clean_water: '💧',
      safe_cities: '🏙️',
      zero_waste: '♻️',
      fair_trade: '🤝',
      biodiversity: '🌱',
      impact_integration: '📊'
    }

    // Map modules with stats (no N+1 queries!)
    const modulesWithStats = (modules || []).map((module) => {
      const enrollmentCount = enrollmentMap.get(module.id) || 0
      const reviewStats = reviewMap.get(module.id) || { count: 0, totalRating: 0 }
      const averageRating = reviewStats.count > 0
        ? reviewStats.totalRating / reviewStats.count
        : 0

      // Handle communities array (Supabase returns array for foreign keys)
      const community = Array.isArray(module.communities) && module.communities.length > 0 
        ? module.communities[0] 
        : null

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        slug: module.slug,
        coreValue: module.core_value,
        difficulty: module.difficulty_level || 'beginner',
        creator: community?.name || module.creator_name || 'Crowd Conscious Platform',
        creatorAvatar: community?.logo_url || coreValueEmojis[module.core_value] || '🌟',
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount: reviewStats.count,
        enrollments: enrollmentCount,
        duration: module.estimated_duration_hours || 8,
        price: module.base_price_mxn,
        individualPrice: module.individual_price_mxn || Math.round(module.base_price_mxn / 50),
        featured: module.featured || false,
        thumbnailUrl: module.thumbnail_url,
        createdAt: module.created_at
      }
    })

    return NextResponse.json({ modules: modulesWithStats }, { status: 200 })
  } catch (error: any) {
    console.error('Error in modules-with-stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

