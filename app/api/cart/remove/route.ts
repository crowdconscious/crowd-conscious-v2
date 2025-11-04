import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// DELETE /api/cart/remove - Remove item from cart
export async function DELETE(request: Request) {
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
        { error: 'Only corporate admins can remove from cart' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { cartItemId } = body

    if (!cartItemId) {
      return NextResponse.json(
        { error: 'Cart item ID is required' },
        { status: 400 }
      )
    }

    // Verify cart item belongs to this corporate account
    const { data: cartItem } = await supabase
      .from('cart_items')
      .select('id, corporate_account_id')
      .eq('id', cartItemId)
      .single()

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    if (cartItem.corporate_account_id !== profile.corporate_account_id) {
      return NextResponse.json(
        { error: 'Unauthorized - Cart item does not belong to you' },
        { status: 403 }
      )
    }

    // Delete cart item
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)

    if (deleteError) {
      console.error('Error removing cart item:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove cart item', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Cart item removed successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/cart/remove:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

