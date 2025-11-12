import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'

// Disable caching for this route - always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    // Use service role key to bypass RLS for public module detail view
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

    console.log('🔍 API: Fetching module details for:', id)

    // Try to determine if id is a UUID or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    
    console.log(`🔍 API: Lookup type: ${isUUID ? 'UUID' : 'SLUG'}`)

    // Fetch module with lessons - by ID or slug
    let query = supabase
      .from('marketplace_modules')
      .select(`
        *,
        lessons:module_lessons(*)
      `)
    
    // Use appropriate field based on lookup type
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }
    
    const { data: module, error: moduleError } = await query
      .eq('status', 'published')
      .single()

    if (moduleError || !module) {
      console.error('❌ API: Module fetch error:', moduleError)
      return ApiResponse.notFound('Module', 'MODULE_NOT_FOUND')
    }

    // Get community info if exists
    let communityInfo = null
    if (module.creator_community_id) {
      const { data: community } = await supabase
        .from('communities')
        .select('id, name, description, image_url')
        .eq('id', module.creator_community_id)
        .single()
      
      communityInfo = community
    }

    // Transform to frontend format
    const transformedModule = {
      id: module.id,
      title: module.title,
      description: module.description,
      longDescription: module.description, // Use same description for now
      slug: module.slug,
      coreValue: module.core_value,
      coreValueIcon: getCoreValueIcon(module.core_value),
      coreValueName: getCoreValueName(module.core_value),
      difficulty: module.difficulty_level,
      creator: module.creator_name,
      creatorAvatar: getCoreValueIcon(module.core_value),
      creatorBio: communityInfo?.description || 'Comunidad verificada',
      rating: module.avg_rating || 4.8,
      reviewCount: module.review_count || 0,
      enrollments: module.enrollment_count || 0,
      duration: module.estimated_duration_hours,
      lessonCount: module.lesson_count || module.lessons?.length || 0,
      
      // Pricing data (Phase 1 - Universal Marketplace)
      base_price_mxn: module.base_price_mxn,
      price_per_50_employees: module.price_per_50_employees,
      individual_price_mxn: module.individual_price_mxn,
      team_discount_percent: module.team_discount_percent || 10,
      
      // Legacy fields (for backwards compatibility)
      price: module.base_price_mxn,
      pricePerEmployee: Math.round(module.base_price_mxn / 50),
      
      featured: module.featured,
      isPlatformModule: module.is_platform_module,
      thumbnailUrl: module.thumbnail_url,
      xpReward: module.xp_reward,
      
      // Curriculum from lessons (summary)
      curriculum: (module.lessons || [])
        .sort((a: any, b: any) => a.lesson_order - b.lesson_order)
        .map((lesson: any) => ({
          title: lesson.title,
          duration: `${lesson.estimated_minutes || 30} min`,
          topics: lesson.key_points || [],
          xp: lesson.xp_reward || 250
        })),
      
      // Full lessons with IDs for lesson player
      lessons: (module.lessons || [])
        .sort((a: any, b: any) => a.lesson_order - b.lesson_order)
        .map((lesson: any) => ({
          id: lesson.id,
          lesson_order: lesson.lesson_order,
          title: lesson.title,
          description: lesson.description,
          estimated_minutes: lesson.estimated_minutes,
          xp_reward: lesson.xp_reward,
          key_points: lesson.key_points || [],
          story_content: lesson.story_content,
          learning_objectives: lesson.learning_objectives,
          did_you_know: lesson.did_you_know,
          real_world_example: lesson.real_world_example,
          activity_type: lesson.activity_type,
          activity_config: lesson.activity_config,
          resources: lesson.resources,
          tools_used: lesson.tools_used,
          next_steps: lesson.next_steps
        })),
      
      // Default data for sections not yet in database
      whatYouLearn: [
        'Implementar estrategias probadas en situaciones reales',
        'Medir y documentar el impacto de tus acciones',
        'Obtener herramientas prácticas y calculadoras',
        'Presentar resultados con datos concretos',
        'Cumplir con estándares de sostenibilidad',
        'Generar reportes para stakeholders'
      ],
      toolsIncluded: [
        'Calculadoras de impacto',
        'Plantillas de implementación',
        'Subidor de evidencia',
        'Dashboard de progreso'
      ],
      outcomes: [
        'Reducción medible de impacto ambiental',
        'Mejora en métricas de sostenibilidad',
        'Datos concretos para reportes ESG',
        'Cumplimiento con regulaciones',
        'Retorno de inversión documentado'
      ],
      testimonials: []
    }

    console.log('✅ API: Module transformed successfully')
    return ApiResponse.ok({ module: transformedModule })

  } catch (error: any) {
    console.error('💥 API: Unexpected error:', error)
    return ApiResponse.serverError('Internal server error', 'MARKETPLACE_MODULE_DETAILS_ERROR', { 
      message: error instanceof Error ? error.message : 'Unknown error'
    })
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

function getCoreValueName(coreValue: string): string {
  const names: Record<string, string> = {
    clean_air: 'Aire Limpio',
    clean_water: 'Agua Limpia',
    safe_cities: 'Ciudades Seguras',
    zero_waste: 'Cero Residuos',
    fair_trade: 'Comercio Justo',
    biodiversity: 'Biodiversidad'
  }
  return names[coreValue] || 'Sostenibilidad'
}

