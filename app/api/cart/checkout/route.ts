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

    // Fetch cart items with module details AND promo codes
    let cartQuery = adminClient
      .from('cart_items')
      .select(`
        id,
        module_id,
        employee_count,
        price_snapshot,
        promo_code_id,
        discounted_price,
        marketplace_modules (
          id,
          title,
          description,
          thumbnail_url,
          base_price_mxn,
          price_per_50_employees
        ),
        promo_codes (
          id,
          code,
          discount_type,
          discount_value
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

    console.log('🛒 Cart items for checkout:', cartItems.map((item: any) => ({
      module: item.marketplace_modules?.title,
      price_snapshot: item.price_snapshot,
      discounted_price: item.discounted_price,
      promo_code_id: item.promo_code_id,
      promo_code: item.promo_codes?.code
    })))

    // Calculate line items for Stripe with promo code discounts
    const lineItems = cartItems.map((item: any) => {
      const module = item.marketplace_modules
      const promoCode = item.promo_codes
      
      // Use discounted_price if promo code applied, otherwise use price_snapshot
      // CRITICAL: Must check for null/undefined, NOT use || (because 0 is falsy!)
      const finalPrice = item.discounted_price !== null && item.discounted_price !== undefined
        ? Number(item.discounted_price)
        : Number(item.price_snapshot)
      
      console.log(`💰 ${module.title}: price_snapshot=${item.price_snapshot}, discounted_price=${item.discounted_price}, using=${finalPrice}`)
      
      let description = isCorporate
        ? `${item.employee_count} empleado${item.employee_count > 1 ? 's' : ''} - ${module.description?.substring(0, 100) || ''}`
        : `Acceso personal - ${module.description?.substring(0, 100) || ''}`
      
      // Add promo code info to description if applied
      if (promoCode) {
        description += ` | Código: ${promoCode.code}`
      }

      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: module.title,
            description,
            images: module.thumbnail_url ? [module.thumbnail_url] : []
          },
          unit_amount: Math.round(finalPrice * 100) // Use discounted price if promo applied
        },
        quantity: 1
      }
    })

    // Calculate total from discounted prices (if promo applied) or price_snapshot
    const totalAmount = cartItems.reduce((sum: number, item: any) => {
      const price = item.discounted_price !== null && item.discounted_price !== undefined
        ? Number(item.discounted_price)
        : Number(item.price_snapshot)
      return sum + price
    }, 0)
    
    console.log(`💳 Stripe total amount: ${totalAmount} MXN = ${totalAmount * 100} cents`)
    
    // Get promo code info for metadata (if any)
    const appliedPromoCodes = cartItems
      .filter((item: any) => item.promo_codes)
      .map((item: any) => ({
        code: item.promo_codes.code,
        module_id: item.module_id,
        discount_type: item.promo_codes.discount_type,
        discount_value: item.promo_codes.discount_value
      }))

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
        purchase_type: isCorporate ? 'corporate' : 'individual', // Critical for webhook!
        corporate_account_id: isCorporate ? profile.corporate_account_id : null,
        company_name: corporateAccount?.company_name || null,
        cart_items: JSON.stringify(cartMetadata),
        total_amount: totalAmount.toString(),
        // Add promo code info for webhook tracking
        promo_codes: appliedPromoCodes.length > 0 ? JSON.stringify(appliedPromoCodes) : null,
        has_discount: appliedPromoCodes.length > 0 ? 'true' : 'false'
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/employee-portal/dashboard?purchase=success`,
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

