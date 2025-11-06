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
        promo_code_id,
        discounted_price,
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
        ),
        promo_codes (
          id,
          code,
          discount_type,
          discount_value
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
      console.error('❌ Error fetching cart items:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return ApiResponse.serverError('Failed to fetch cart items', error.message)
    }

    console.log(`✅ Fetched ${cartItems?.length || 0} cart items for user ${user.id}`)

    // Enrich cart items with calculated pricing
    let enrichedCartItems: any[] = []
    try {
      enrichedCartItems = (cartItems || [])
        .filter(item => {
          // Filter out items where module doesn't exist (deleted modules)
          const module = (item as any).marketplace_modules
          if (!module) {
            console.warn(`⚠️ Cart item ${item.id} has no module (module deleted?)`)
            return false
          }
          return true
        })
        .map(item => {
        const module = (item as any).marketplace_modules
        const promoCode = (item as any).promo_codes
        
        console.log('📦 Processing cart item:', {
          id: item.id,
          price_snapshot: item.price_snapshot,
          price_snapshot_type: typeof item.price_snapshot,
          discounted_price: item.discounted_price,
          discounted_price_type: typeof item.discounted_price,
          promo_code_id: item.promo_code_id
        })
        
        // Use discounted_price if promo applied, otherwise use price_snapshot
        // CRITICAL: Convert strings to numbers!
        const finalPrice = item.discounted_price !== null && item.discounted_price !== undefined
          ? Number(item.discounted_price)
          : Number(item.price_snapshot)
        const originalPrice = Number(item.price_snapshot)
        const hasDiscount = item.discounted_price !== null && item.discounted_price !== undefined
        
        const discountAmount = hasDiscount ? originalPrice - finalPrice : 0
        
        console.log('💰 Calculated prices:', {
          finalPrice,
          originalPrice,
          hasDiscount,
          discountAmount
        })
        
        return {
          id: item.id,
          module_id: item.module_id,
          employee_count: item.employee_count,
          price_snapshot: item.price_snapshot,
          discounted_price: item.discounted_price,
          promo_code_id: item.promo_code_id,
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
          promo_code: promoCode ? {
            code: promoCode.code,
            discount_type: promoCode.discount_type,
            discount_value: promoCode.discount_value
          } : null,
          total_price: finalPrice,
          original_price: originalPrice,
          discount_amount: discountAmount, // Use pre-calculated value
          price_per_employee: Math.round(finalPrice / item.employee_count)
        }
      })
    } catch (enrichError) {
      console.error('❌ Error enriching cart items:', enrichError)
      console.error('Cart items data:', JSON.stringify(cartItems, null, 2))
      return ApiResponse.serverError('Failed to process cart items')
    }

    // Calculate cart totals (using final/discounted prices)
    const cartTotal = enrichedCartItems.reduce((sum, item) => sum + item.total_price, 0)
    const originalTotal = enrichedCartItems.reduce((sum, item) => sum + item.original_price, 0)
    const totalDiscount = enrichedCartItems.reduce((sum, item) => sum + item.discount_amount, 0)
    const totalEmployees = enrichedCartItems.reduce((sum, item) => sum + item.employee_count, 0)
    const hasPromo = enrichedCartItems.some(item => item.promo_code !== null)
    
    console.log('📊 Cart totals calculated:', {
      enrichedItemsCount: enrichedCartItems.length,
      cartTotal,
      originalTotal,
      totalDiscount,
      totalEmployees,
      hasPromo,
      itemDiscounts: enrichedCartItems.map(i => ({ 
        id: i.id, 
        discount: i.discount_amount,
        original: i.original_price,
        final: i.total_price
      }))
    })

    return ApiResponse.ok({
      items: enrichedCartItems,
      summary: {
        item_count: enrichedCartItems.length,
        total_price: cartTotal,
        original_total: originalTotal,
        total_discount: totalDiscount,
        total_employees: totalEmployees,
        has_promo: hasPromo
      }
    })
  } catch (error) {
    console.error('Error in GET /api/cart:', error)
    return ApiResponse.serverError()
  }
}

