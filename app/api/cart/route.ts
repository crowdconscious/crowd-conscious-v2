import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET /api/cart - Fetch current user's cart items
export async function GET() {
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

    // Use admin client for database queries to bypass RLS permission issues
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

    // Get user profile to find corporate_account_id
    const { data: profile } = await adminClient
      .from('profiles')
      .select('corporate_account_id, corporate_role')
      .eq('id', user.id)
      .single()

    if (!profile?.corporate_account_id || profile?.corporate_role !== 'admin') {
      return NextResponse.json(
        { error: 'Only corporate admins can access cart' },
        { status: 403 }
      )
    }

    // Fetch cart items with module details
    const { data: cartItems, error } = await adminClient
      .from('cart_items')
      .select(`
        id,
        module_id,
        employee_count,
        price_snapshot,
        added_at,
        marketplace_modules (
          id,
          title,
          description,
          slug,
          core_value,
          difficulty_level,
          estimated_duration_hours,
          base_price_mxn,
          price_per_50_employees,
          thumbnail_url,
          creator_name,
          avg_rating,
          review_count
        )
      `)
      .eq('corporate_account_id', profile.corporate_account_id)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Error fetching cart items:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cart items', details: error.message },
        { status: 500 }
      )
    }

    // Calculate total price for each item
    const enrichedCartItems = (cartItems || []).map(item => {
      const module = (item as any).marketplace_modules
      const packs = Math.ceil(item.employee_count / 50)
      const totalPrice = module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)
      
      return {
        id: item.id,
        module_id: item.module_id,
        employee_count: item.employee_count,
        price_snapshot: item.price_snapshot,
        added_at: item.added_at,
        module: {
          id: module.id,
          title: module.title,
          description: module.description,
          slug: module.slug,
          core_value: module.core_value,
          difficulty_level: module.difficulty_level,
          estimated_duration_hours: module.estimated_duration_hours,
          base_price_mxn: module.base_price_mxn,
          price_per_50_employees: module.price_per_50_employees,
          thumbnail_url: module.thumbnail_url,
          creator_name: module.creator_name,
          avg_rating: module.avg_rating,
          review_count: module.review_count
        },
        total_price: totalPrice,
        price_per_employee: Math.round(totalPrice / item.employee_count)
      }
    })

    // Calculate cart totals
    const cartTotal = enrichedCartItems.reduce((sum, item) => sum + item.total_price, 0)
    const totalEmployees = enrichedCartItems.reduce((sum, item) => sum + item.employee_count, 0)

    return NextResponse.json({
      items: enrichedCartItems,
      summary: {
        item_count: enrichedCartItems.length,
        total_price: cartTotal,
        total_employees: totalEmployees
      }
    })
  } catch (error) {
    console.error('Error in GET /api/cart:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

