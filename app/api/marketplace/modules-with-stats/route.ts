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

    // For each module, fetch enrollment count and review stats
    const modulesWithStats = await Promise.all(
      (modules || []).map(async (module) => {
        // Get enrollment count
        const { count: enrollmentCount } = await supabase
          .from('course_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('module_id', module.id)

        // Get review stats
        const { data: reviews } = await supabase
          .from('module_reviews')
          .select('rating')
          .eq('module_id', module.id)

        const reviewCount = reviews?.length || 0
        const averageRating = reviewCount > 0
          ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0

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

        return {
          id: module.id,
          title: module.title,
          description: module.description,
          slug: module.slug,
          coreValue: module.core_value,
          difficulty: module.difficulty_level || 'beginner',
          creator: module.communities?.name || module.creator_name || 'Crowd Conscious Platform',
          creatorAvatar: module.communities?.logo_url || coreValueEmojis[module.core_value] || '🌟',
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          reviewCount: reviewCount,
          enrollments: enrollmentCount || 0,
          duration: module.estimated_duration_hours || 8,
          price: module.base_price_mxn,
          individualPrice: module.individual_price_mxn || Math.round(module.base_price_mxn / 50),
          featured: module.featured || false,
          thumbnailUrl: module.thumbnail_url,
          createdAt: module.created_at
        }
      })
    )

    return NextResponse.json({ modules: modulesWithStats }, { status: 200 })
  } catch (error: any) {
    console.error('Error in modules-with-stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

