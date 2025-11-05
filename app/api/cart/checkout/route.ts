import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

// POST /api/cart/checkout - Create Stripe checkout session
export async function POST() {
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
      .select('corporate_account_id, corporate_role, email, full_name')
      .eq('id', user.id)
      .single()

    // Determine if user is corporate admin or individual
    const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id

    // Get corporate account details (if corporate)
    let corporateAccount = null
    if (isCorporate) {
      const { data } = await adminClient
        .from('corporate_accounts')
        .select('company_name, id')
        .eq('id', profile.corporate_account_id!)
        .single()
      
      corporateAccount = data
      
      if (!corporateAccount) {
        return ApiResponse.notFound('Corporate account')
      }
    }

    // Fetch cart items with module details
    let cartQuery = adminClient
      .from('cart_items')
      .select(`
        id,
        module_id,
        employee_count,
        price_snapshot,
        marketplace_modules (
          id,
          title,
          description,
          thumbnail_url,
          base_price_mxn,
          price_per_50_employees
        )
      `)

    // Filter by owner type
    if (isCorporate) {
      cartQuery = cartQuery.eq('corporate_account_id', profile.corporate_account_id!)
    } else {
      cartQuery = cartQuery.eq('user_id', user.id)
    }

    const { data: cartItems, error: cartError } = await cartQuery

    if (cartError || !cartItems || cartItems.length === 0) {
      return ApiResponse.badRequest('Cart is empty or failed to fetch')
    }

    // Calculate line items for Stripe
    const lineItems = cartItems.map((item: any) => {
      const module = item.marketplace_modules
      const description = isCorporate
        ? `${item.employee_count} empleado${item.employee_count > 1 ? 's' : ''} - ${module.description?.substring(0, 100) || ''}`
        : `Acceso personal - ${module.description?.substring(0, 100) || ''}`

      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: module.title,
            description,
            images: module.thumbnail_url ? [module.thumbnail_url] : []
          },
          unit_amount: Math.round(item.price_snapshot * 100) // Use price_snapshot (already calculated)
        },
        quantity: 1
      }
    })

    // Calculate total from price_snapshot
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + item.price_snapshot, 0)

    // Prepare metadata for webhook
    const cartMetadata = cartItems.map((item: any) => ({
      module_id: item.module_id,
      employee_count: item.employee_count,
      price: item.price_snapshot
    }))

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: profile?.email || user.email,
      client_reference_id: isCorporate ? profile.corporate_account_id : user.id,
      metadata: {
        type: 'module_purchase',
        user_id: user.id,
        purchase_type: isCorporate ? 'corporate' : 'individual', // NEW: Critical for webhook!
        corporate_account_id: isCorporate ? profile.corporate_account_id : null,
        company_name: corporateAccount?.company_name || null,
        cart_items: JSON.stringify(cartMetadata),
        total_amount: totalAmount.toString()
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?cancelled=true`
    })

    return ApiResponse.ok({
      url: session.url,
      sessionId: session.id
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return ApiResponse.serverError('Failed to create checkout session', error.message)
  }
}

