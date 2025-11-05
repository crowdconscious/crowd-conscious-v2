import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

// DELETE /api/cart/clear - Clear entire cart
export async function DELETE() {
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

    // Delete all cart items for this user
    let deleteQuery = adminClient
      .from('cart_items')
      .delete()

    if (isCorporate) {
      deleteQuery = deleteQuery.eq('corporate_account_id', profile.corporate_account_id!)
    } else {
      deleteQuery = deleteQuery.eq('user_id', user.id)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Error clearing cart:', deleteError)
      return ApiResponse.serverError('Failed to clear cart')
    }

    return ApiResponse.ok({
      message: 'Cart cleared successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/cart/clear:', error)
    return ApiResponse.serverError()
  }
}

