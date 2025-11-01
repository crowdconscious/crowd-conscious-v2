import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

/**
 * POST /api/marketplace/purchase
 * 
 * Process marketplace module purchase:
 * 1. Create Stripe payment intent
 * 2. Process module sale (revenue split)
 * 3. Create course enrollments
 * 4. Distribute revenue to wallets
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request body
    const { moduleId, employeeCount = 50, paymentMethodId } = await request.json()

    // Validate input
    if (!moduleId || !employeeCount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get corporate account
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, corporate_role, is_corporate_user')
      .eq('id', user.id)
      .single()

    if (!profile?.is_corporate_user || profile.corporate_role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only corporate admins can purchase modules' },
        { status: 403 }
      )
    }

    if (!profile.corporate_account_id) {
      return NextResponse.json(
        { success: false, error: 'No corporate account found' },
        { status: 400 }
      )
    }

    // Get module details
    const { data: module, error: moduleError } = await supabase
      .from('marketplace_modules')
      .select('*')
      .eq('id', moduleId)
      .eq('status', 'published')
      .single()

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      )
    }

    // Calculate total price
    const basePrice = module.base_price_mxn // First 50 employees
    const additionalPacks = Math.max(0, Math.ceil((employeeCount - 50) / 50))
    const totalAmount = basePrice + (additionalPacks * module.price_per_50_employees)

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'mxn',
      payment_method: paymentMethodId,
      confirmation_method: 'automatic',
      confirm: true,
      metadata: {
        type: 'marketplace_purchase',
        module_id: moduleId,
        corporate_account_id: profile.corporate_account_id,
        employee_count: employeeCount.toString(),
      },
    })

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment failed',
          requires_action: paymentIntent.status === 'requires_action',
          client_secret: paymentIntent.client_secret,
        },
        { status: 402 }
      )
    }

    // Payment successful - process module sale with revenue split
    const { data: sale, error: saleError } = await supabase.rpc(
      'process_module_sale',
      {
        p_module_id: moduleId,
        p_corporate_account_id: profile.corporate_account_id,
        p_total_amount: totalAmount,
        p_employee_count: employeeCount,
        p_creator_donates: false, // Default to false, can be made configurable
        p_payment_method: 'stripe',
        p_payment_id: paymentIntent.id,
      }
    )

    if (saleError) {
      console.error('Error processing module sale:', saleError)
      
      // Refund payment if sale processing failed
      await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        reason: 'requested_by_customer',
      })

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process sale. Payment has been refunded.',
          details: saleError.message,
        },
        { status: 500 }
      )
    }

    // Create course enrollment for corporate account
    const { error: enrollmentError } = await supabase
      .from('course_enrollments')
      .insert({
        employee_id: user.id, // Corporate admin is also enrolled
        corporate_account_id: profile.corporate_account_id,
        module_id: moduleId,
        module_name: module.title,
        status: 'not_started',
      })
      .select()
      .single()

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError)
      // Don't fail the purchase, just log it
    }

    // Update module purchase stats
    await supabase
      .from('marketplace_modules')
      .update({
        purchase_count: module.purchase_count + 1,
        enrollment_count: module.enrollment_count + employeeCount,
      })
      .eq('id', moduleId)

    // Log corporate activity
    await supabase
      .from('corporate_activity_log')
      .insert({
        corporate_account_id: profile.corporate_account_id,
        user_id: user.id,
        action_type: 'module_purchased',
        action_details: {
          module_id: moduleId,
          module_title: module.title,
          employee_count: employeeCount,
          total_amount: totalAmount,
          payment_intent_id: paymentIntent.id,
        },
      })

    return NextResponse.json({
      success: true,
      data: {
        sale_id: sale,
        module: {
          id: module.id,
          title: module.title,
          description: module.description,
        },
        purchase: {
          total_amount: totalAmount,
          employee_count: employeeCount,
          payment_intent_id: paymentIntent.id,
        },
        revenue_split: {
          platform_fee: totalAmount * 0.30,
          community_share: totalAmount * 0.50,
          creator_share: totalAmount * 0.20,
        },
      },
    })

  } catch (error: any) {
    console.error('Marketplace purchase error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/marketplace/purchase
 * 
 * Get purchase history for corporate account
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get corporate account
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, is_corporate_user')
      .eq('id', user.id)
      .single()

    if (!profile?.is_corporate_user || !profile.corporate_account_id) {
      return NextResponse.json(
        { success: false, error: 'Not a corporate user' },
        { status: 403 }
      )
    }

    // Get purchase history
    const { data: purchases, error } = await supabase
      .from('module_sales')
      .select(`
        *,
        marketplace_modules (
          id,
          title,
          description,
          thumbnail_url,
          core_value
        )
      `)
      .eq('corporate_account_id', profile.corporate_account_id)
      .order('purchased_at', { ascending: false })

    if (error) {
      console.error('Error fetching purchases:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch purchases' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: purchases || [],
    })

  } catch (error: any) {
    console.error('Get purchases error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

