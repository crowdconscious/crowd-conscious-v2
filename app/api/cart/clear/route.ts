import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// DELETE /api/cart/clear - Clear entire cart
export async function DELETE() {
  try {
    // Use regular client for auth check
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Use admin client for database queries to bypass RLS
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user profile
    const { data: profile } = await adminClient
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
    const { error: deleteError } = await adminClient
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

