import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized()
    }

    const { code } = await request.json()

    if (!code) {
      return ApiResponse.badRequest('Promo code is required')
    }

    const adminClient = createAdminClient()

    // Get user's cart
    const { data: profile } = await adminClient
      .from('profiles')
      .select('corporate_account_id, corporate_role')
      .eq('id', user.id)
      .single()

    const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id

    // Fetch cart items
    const cartQuery = isCorporate
      ? adminClient.from('cart_items').select('*, marketplace_modules(*)').eq('corporate_account_id', profile.corporate_account_id)
      : adminClient.from('cart_items').select('*, marketplace_modules(*)').eq('user_id', user.id)

    const { data: cartItems, error: cartError } = await cartQuery

    if (cartError || !cartItems || cartItems.length === 0) {
      return ApiResponse.badRequest('Cart is empty')
    }

    // Calculate cart total
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.price_snapshot || 0), 0)

    // Validate promo code using the database function
    const { data: validationResult, error: validationError } = await adminClient
      .rpc('validate_promo_code', {
        p_code: code.toUpperCase().trim(),
        p_user_id: user.id,
        p_cart_total: cartTotal,
        p_purchase_type: isCorporate ? 'corporate' : 'individual'
      })

    if (validationError) {
      console.error('Error validating promo code:', validationError)
      return ApiResponse.serverError('Failed to validate promo code')
    }

    if (!validationResult.valid) {
      return ApiResponse.badRequest(validationResult.error)
    }

    // Apply promo code to cart items
    const promoCodeId = validationResult.promo_code_id
    const discountAmount = validationResult.discount_amount
    const discountPerItem = discountAmount / cartItems.length

    for (const item of cartItems) {
      const itemDiscount = discountPerItem
      const discountedPrice = Math.max((item.price_snapshot || 0) - itemDiscount, 0)

      await adminClient
        .from('cart_items')
        .update({
          promo_code_id: promoCodeId,
          discounted_price: discountedPrice
        })
        .eq('id', item.id)
    }

    return ApiResponse.ok({
      message: 'Promo code applied successfully',
      code: validationResult.code,
      discount_type: validationResult.discount_type,
      discount_amount: validationResult.discount_amount,
      original_total: validationResult.original_total,
      final_total: validationResult.final_total,
      savings_percentage: validationResult.savings_percentage
    })

  } catch (error) {
    console.error('Unexpected error applying promo code:', error)
    return ApiResponse.serverError('An unexpected error occurred')
  }
}

// Remove promo code
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized()
    }

    const adminClient = createAdminClient()

    // Get user's cart
    const { data: profile } = await adminClient
      .from('profiles')
      .select('corporate_account_id, corporate_role')
      .eq('id', user.id)
      .single()

    const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id

    // Remove promo code from cart items
    const updateQuery = isCorporate
      ? adminClient.from('cart_items').update({
          promo_code_id: null,
          discounted_price: null
        }).eq('corporate_account_id', profile.corporate_account_id)
      : adminClient.from('cart_items').update({
          promo_code_id: null,
          discounted_price: null
        }).eq('user_id', user.id)

    const { error } = await updateQuery

    if (error) {
      return ApiResponse.serverError('Failed to remove promo code')
    }

    return ApiResponse.ok({ message: 'Promo code removed' })

  } catch (error) {
    console.error('Error removing promo code:', error)
    return ApiResponse.serverError('An unexpected error occurred')
  }
}

