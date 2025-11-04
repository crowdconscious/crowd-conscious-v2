import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// PUT /api/cart/update - Update employee count for cart item
export async function PUT(request: Request) {
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
        { error: 'Only corporate admins can update cart' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { cartItemId, employeeCount } = body

    if (!cartItemId || !employeeCount) {
      return NextResponse.json(
        { error: 'Cart item ID and employee count are required' },
        { status: 400 }
      )
    }

    if (employeeCount < 1) {
      return NextResponse.json(
        { error: 'Employee count must be at least 1' },
        { status: 400 }
      )
    }

    // Fetch cart item to verify ownership and get module details
    const { data: cartItem, error: fetchError } = await supabase
      .from('cart_items')
      .select(`
        id,
        module_id,
        corporate_account_id,
        marketplace_modules (
          base_price_mxn,
          price_per_50_employees
        )
      `)
      .eq('id', cartItemId)
      .single()

    if (fetchError || !cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (cartItem.corporate_account_id !== profile.corporate_account_id) {
      return NextResponse.json(
        { error: 'Unauthorized - Cart item does not belong to you' },
        { status: 403 }
      )
    }

    // Calculate new price
    const module = (cartItem as any).marketplace_modules
    const packs = Math.ceil(employeeCount / 50)
    const totalPrice = module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)

    // Update cart item
    const { data: updatedItem, error: updateError } = await supabase
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
      return NextResponse.json(
        { error: 'Failed to update cart item', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Cart item updated successfully',
      cartItem: updatedItem
    })
  } catch (error) {
    console.error('Error in PUT /api/cart/update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

