import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import { calculateModulePrice } from '@/lib/pricing'

// PUT /api/cart/update - Update employee count for cart item
export async function PUT(request: Request) {
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
    const { cartItemId, employeeCount } = body

    // Validation
    if (!cartItemId || !employeeCount) {
      return ApiResponse.badRequest('Cart item ID and employee count are required')
    }

    if (employeeCount < 1) {
      return ApiResponse.badRequest('Employee count must be at least 1')
    }

    // Individual users can only purchase for themselves
    if (!isCorporate && employeeCount > 1) {
      return ApiResponse.badRequest('Individual users can only purchase for 1 person')
    }

    // Fetch cart item to verify ownership and get module details
    const { data: cartItem, error: fetchError } = await adminClient
      .from('cart_items')
      .select(`
        id,
        module_id,
        user_id,
        corporate_account_id,
        marketplace_modules (
          base_price_mxn,
          price_per_50_employees,
          individual_price_mxn,
          is_platform_module
        )
      `)
      .eq('id', cartItemId)
      .single()

    if (fetchError || !cartItem) {
      console.error('Error fetching cart item:', fetchError)
      return ApiResponse.notFound('Cart item')
    }

    // Verify ownership
    const ownsItem = isCorporate
      ? cartItem.corporate_account_id === profile.corporate_account_id
      : cartItem.user_id === user.id

    if (!ownsItem) {
      return ApiResponse.forbidden('Cart item does not belong to you')
    }

    // Calculate new price using pricing utility
    const module = (cartItem as any).marketplace_modules
    const totalPrice = calculateModulePrice(
      {
        base_price_mxn: module.base_price_mxn,
        price_per_50_employees: module.price_per_50_employees,
        individual_price_mxn: module.individual_price_mxn,
        is_platform_module: module.is_platform_module
      },
      employeeCount
    )

    // Update cart item
    const { data: updatedItem, error: updateError } = await adminClient
      .from('cart_items')
      .update({
        employee_count: employeeCount,
        price_snapshot: totalPrice
      })
      .eq('id', cartItemId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating cart item:', updateError)
      return ApiResponse.serverError('Failed to update cart item')
    }

    return ApiResponse.ok({
      message: 'Cart item updated successfully',
      cartItem: updatedItem
    })
  } catch (error) {
    console.error('Error in PUT /api/cart/update:', error)
    return ApiResponse.serverError()
  }
}

