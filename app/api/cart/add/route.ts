import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// POST /api/cart/add - Add module to cart
export async function POST(request: Request) {
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
        { error: 'Only corporate admins can add to cart' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { moduleId, employeeCount = 50 } = body

    if (!moduleId) {
      return NextResponse.json(
        { error: 'Module ID is required' },
        { status: 400 }
      )
    }

    if (employeeCount < 1) {
      return NextResponse.json(
        { error: 'Employee count must be at least 1' },
        { status: 400 }
      )
    }

    // Fetch module details to get current price
    const { data: module, error: moduleError } = await adminClient
      .from('marketplace_modules')
      .select('id, title, base_price_mxn, price_per_50_employees, status')
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      console.error('Error fetching module:', moduleError)
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      )
    }

    if (module.status !== 'published') {
      return NextResponse.json(
        { error: 'Module is not available for purchase' },
        { status: 400 }
      )
    }

    // Check if module is already owned by this corporate account
    const { data: existingEnrollment } = await adminClient
      .from('course_enrollments')
      .select('id')
      .eq('corporate_account_id', profile.corporate_account_id)
      .eq('module_id', moduleId)
      .limit(1)
      .maybeSingle()

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Module already owned by your company' },
        { status: 400 }
      )
    }

    // Calculate price based on employee count
    const packs = Math.ceil(employeeCount / 50)
    const totalPrice = module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)

    // Check if item already in cart (update instead of insert)
    const { data: existingItem } = await adminClient
      .from('cart_items')
      .select('id')
      .eq('corporate_account_id', profile.corporate_account_id)
      .eq('module_id', moduleId)
      .maybeSingle()

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
        return NextResponse.json(
          { error: 'Failed to update cart item', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Cart item updated',
        cartItem: updatedItem,
        action: 'updated'
      })
    } else {
      // Insert new cart item
      const { data: newItem, error: insertError } = await adminClient
        .from('cart_items')
        .insert({
          corporate_account_id: profile.corporate_account_id,
          module_id: moduleId,
          employee_count: employeeCount,
          price_snapshot: totalPrice
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error adding to cart:', insertError)
        return NextResponse.json(
          { error: 'Failed to add to cart', details: insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Module added to cart',
        cartItem: newItem,
        action: 'added'
      })
    }
  } catch (error) {
    console.error('Error in POST /api/cart/add:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

