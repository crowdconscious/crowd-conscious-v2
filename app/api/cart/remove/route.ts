import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

// DELETE /api/cart/remove - Remove item from cart
export async function DELETE(request: Request) {
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
    const { cartItemId } = body

    // Validation
    if (!cartItemId) {
      return ApiResponse.badRequest('Cart item ID is required')
    }

    // Verify cart item belongs to this user
    const { data: cartItem } = await adminClient
      .from('cart_items')
      .select('id, user_id, corporate_account_id')
      .eq('id', cartItemId)
      .single()

    if (!cartItem) {
      return ApiResponse.notFound('Cart item')
    }

    // Verify ownership
    const ownsItem = isCorporate
      ? cartItem.corporate_account_id === profile.corporate_account_id
      : cartItem.user_id === user.id

    if (!ownsItem) {
      return ApiResponse.forbidden('Cart item does not belong to you')
    }

    // Delete cart item
    const { error: deleteError } = await adminClient
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)

    if (deleteError) {
      console.error('Error removing cart item:', deleteError)
      return ApiResponse.serverError('Failed to remove cart item')
    }

    return ApiResponse.ok({
      message: 'Cart item removed successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/cart/remove:', error)
    return ApiResponse.serverError()
  }
}

