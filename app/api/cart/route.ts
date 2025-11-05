import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import { calculateModulePrice } from '@/lib/pricing'

// GET /api/cart - Fetch current user's cart items
export async function GET() {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized()
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get user profile to determine user type
    const { data: profile } = await adminClient
      .from('profiles')
      .select('corporate_account_id, corporate_role')
      .eq('id', user.id)
      .single()

    // Determine if user is corporate admin or individual
    const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id

    // Build query based on user type
    let query = adminClient
      .from('cart_items')
      .select(`
        id,
        module_id,
        employee_count,
        price_snapshot,
        added_at,
        marketplace_modules (
          id,
          title,
          description,
          slug,
          core_value,
          difficulty_level,
          estimated_duration_hours,
          base_price_mxn,
          price_per_50_employees,
          individual_price_mxn,
          thumbnail_url,
          creator_name,
          avg_rating,
          review_count
        )
      `)
      .order('added_at', { ascending: false })

    // Filter by owner type
    if (isCorporate) {
      query = query.eq('corporate_account_id', profile.corporate_account_id)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data: cartItems, error } = await query

    if (error) {
      console.error('Error fetching cart items:', error)
      return ApiResponse.serverError('Failed to fetch cart items', error.message)
    }

    // Enrich cart items with calculated pricing
    const enrichedCartItems = (cartItems || []).map(item => {
      const module = (item as any).marketplace_modules
      const totalPrice = calculateModulePrice(
        {
          base_price_mxn: module.base_price_mxn,
          price_per_50_employees: module.price_per_50_employees,
          individual_price_mxn: module.individual_price_mxn,
          is_platform_module: false
        },
        item.employee_count
      )
      
      return {
        id: item.id,
        module_id: item.module_id,
        employee_count: item.employee_count,
        price_snapshot: item.price_snapshot,
        added_at: item.added_at,
        module: {
          id: module.id,
          title: module.title,
          description: module.description,
          slug: module.slug,
          core_value: module.core_value,
          difficulty_level: module.difficulty_level,
          estimated_duration_hours: module.estimated_duration_hours,
          base_price_mxn: module.base_price_mxn,
          price_per_50_employees: module.price_per_50_employees,
          thumbnail_url: module.thumbnail_url,
          creator_name: module.creator_name,
          avg_rating: module.avg_rating,
          review_count: module.review_count
        },
        total_price: totalPrice,
        price_per_employee: Math.round(totalPrice / item.employee_count)
      }
    })

    // Calculate cart totals
    const cartTotal = enrichedCartItems.reduce((sum, item) => sum + item.total_price, 0)
    const totalEmployees = enrichedCartItems.reduce((sum, item) => sum + item.employee_count, 0)

    return ApiResponse.ok({
      items: enrichedCartItems,
      summary: {
        item_count: enrichedCartItems.length,
        total_price: cartTotal,
        total_employees: totalEmployees
      }
    })
  } catch (error) {
    console.error('Error in GET /api/cart:', error)
    return ApiResponse.serverError()
  }
}

