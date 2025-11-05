import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import { calculateModulePrice } from '@/lib/pricing'

// POST /api/cart/add - Add module to cart
export async function POST(request: Request) {
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

    // Parse request body
    const body = await request.json()
    const { moduleId, employeeCount = (isCorporate ? 50 : 1) } = body

    // Validation
    if (!moduleId) {
      return ApiResponse.badRequest('Module ID is required')
    }

    if (employeeCount < 1) {
      return ApiResponse.badRequest('Employee count must be at least 1')
    }

    // Individual users can only purchase for themselves
    if (!isCorporate && employeeCount > 1) {
      return ApiResponse.badRequest('Individual users can only purchase for 1 person')
    }

    // Fetch module details
    const { data: module, error: moduleError } = await adminClient
      .from('marketplace_modules')
      .select('id, title, base_price_mxn, price_per_50_employees, individual_price_mxn, status, is_platform_module')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      console.error('Error fetching module:', moduleError)
      return ApiResponse.notFound('Module')
    }

    if (module.status !== 'published') {
      return ApiResponse.badRequest('Module is not available for purchase')
    }

    // Check if module is already owned
    const ownershipQuery = adminClient
      .from('course_enrollments')
      .select('id')
      .eq('module_id', moduleId)
      .limit(1)

    if (isCorporate) {
      ownershipQuery.eq('corporate_account_id', profile.corporate_account_id!)
    } else {
      ownershipQuery.eq('user_id', user.id)
    }

    const { data: existingEnrollment } = await ownershipQuery.maybeSingle()

    if (existingEnrollment) {
      return ApiResponse.conflict('You already own this module')
    }

    // Calculate price using pricing utility
    const totalPrice = calculateModulePrice(
      {
        base_price_mxn: module.base_price_mxn,
        price_per_50_employees: module.price_per_50_employees,
        individual_price_mxn: module.individual_price_mxn,
        is_platform_module: module.is_platform_module
      },
      employeeCount
    )

    // Check if item already in cart
    const cartQuery = adminClient
      .from('cart_items')
      .select('id')
      .eq('module_id', moduleId)

    if (isCorporate) {
      cartQuery.eq('corporate_account_id', profile.corporate_account_id!)
    } else {
      cartQuery.eq('user_id', user.id)
    }

    const { data: existingItem } = await cartQuery.maybeSingle()

    if (existingItem) {
      // Update existing cart item
      const { data: updatedItem, error: updateError } = await adminClient
        .from('cart_items')
        .update({
          employee_count: employeeCount,
          price_snapshot: totalPrice
        })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating cart item:', updateError)
        return ApiResponse.serverError('Failed to update cart item')
      }

      return ApiResponse.ok({
        message: 'Cart item updated',
        cartItem: updatedItem,
        action: 'updated'
      })
    } else {
      // Insert new cart item with appropriate owner
      const { data: newItem, error: insertError } = await adminClient
        .from('cart_items')
        .insert({
          user_id: isCorporate ? null : user.id,
          corporate_account_id: isCorporate ? profile.corporate_account_id : null,
          module_id: moduleId,
          employee_count: employeeCount,
          price_snapshot: totalPrice
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error adding to cart:', insertError)
        return ApiResponse.serverError('Failed to add to cart')
      }

      return ApiResponse.created({
        message: 'Module added to cart',
        cartItem: newItem,
        action: 'added'
      })
    }
  } catch (error) {
    console.error('Error in POST /api/cart/add:', error)
    return ApiResponse.serverError()
  }
}

