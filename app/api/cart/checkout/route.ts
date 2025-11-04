import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

// POST /api/cart/checkout - Create Stripe checkout session
export async function POST() {
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
      .select('corporate_account_id, corporate_role, email, full_name')
      .eq('id', user.id)
      .single()

    if (!profile?.corporate_account_id || profile?.corporate_role !== 'admin') {
      return NextResponse.json(
        { error: 'Only corporate admins can checkout' },
        { status: 403 }
      )
    }

    // Get corporate account details
    const { data: corporateAccount } = await supabase
      .from('corporate_accounts')
      .select('company_name, id')
      .eq('id', profile.corporate_account_id)
      .single()

    if (!corporateAccount) {
      return NextResponse.json(
        { error: 'Corporate account not found' },
        { status: 404 }
      )
    }

    // Fetch cart items with module details
    const { data: cartItems, error: cartError } = await supabase
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
      .eq('corporate_account_id', profile.corporate_account_id)

    if (cartError || !cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty or failed to fetch' },
        { status: 400 }
      )
    }

    // Calculate line items for Stripe
    const lineItems = cartItems.map((item: any) => {
      const module = item.marketplace_modules
      const packs = Math.ceil(item.employee_count / 50)
      const totalPrice = module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)

      return {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: module.title,
            description: `${item.employee_count} empleados - ${module.description?.substring(0, 100) || ''}`,
            images: module.thumbnail_url ? [module.thumbnail_url] : []
          },
          unit_amount: Math.round(totalPrice * 100) // Convert to cents
        },
        quantity: 1
      }
    })

    // Calculate total
    const totalAmount = cartItems.reduce((sum: number, item: any) => {
      const module = item.marketplace_modules
      const packs = Math.ceil(item.employee_count / 50)
      return sum + (module.base_price_mxn + ((packs - 1) * module.price_per_50_employees))
    }, 0)

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
      customer_email: profile.email || user.email,
      client_reference_id: profile.corporate_account_id,
      metadata: {
        type: 'module_purchase',
        corporate_account_id: profile.corporate_account_id,
        user_id: user.id,
        company_name: corporateAccount.company_name,
        cart_items: JSON.stringify(cartMetadata),
        total_amount: totalAmount.toString()
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/corporate/dashboard?purchase=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/corporate/checkout?cancelled=true`
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    )
  }
}

