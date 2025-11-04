import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// DELETE /api/cart/clear - Clear entire cart
export async function DELETE() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, corporate_role')
      .eq('id', user.id)
      .single()

    if (!profile?.corporate_account_id || profile?.corporate_role !== 'admin') {
      return NextResponse.json(
        { error: 'Only corporate admins can clear cart' },
        { status: 403 }
      )
    }

    // Delete all cart items for this corporate account
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('corporate_account_id', profile.corporate_account_id)

    if (deleteError) {
      console.error('Error clearing cart:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear cart', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Cart cleared successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/cart/clear:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

