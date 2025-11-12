import Stripe from 'stripe'
import { getSupabase } from '../lib/stripe-webhook-utils'

/**
 * Handle module purchase after successful payment
 * Processes revenue distribution, enrollments, promo codes, and cart clearing
 */
export async function handleModulePurchase(session: Stripe.Checkout.Session) {
  try {
    console.log('🎯 WEBHOOK: handleModulePurchase called')
    console.log('🎯 WEBHOOK: Session ID:', session.id)
    console.log('🎯 WEBHOOK: Payment status:', session.payment_status)
    
    const supabaseClient = getSupabase()
    const {
      purchase_type, // 'individual' or 'corporate'
      user_id,
      corporate_account_id,
      company_name,
      cart_items,
      total_amount,
      promo_codes, // JSON string of applied promo codes
      has_discount // 'true' or 'false'
    } = session.metadata || {}

    console.log('📦 WEBHOOK: Module purchase metadata:', {
      purchase_type,
      user_id,
      corporate_account_id,
      company_name,
      cart_items_length: cart_items?.length,
      cart_items_preview: cart_items?.substring(0, 200),
      total_amount
    })

    // Validate required metadata
    if (!user_id || !cart_items || !purchase_type) {
      console.error('❌ WEBHOOK ERROR: Missing required metadata', {
        has_user_id: !!user_id,
        has_cart_items: !!cart_items,
        has_purchase_type: !!purchase_type,
        all_metadata: session.metadata
      })
      return
    }

    console.log('✅ WEBHOOK: Metadata validated successfully')

    const cartItemsData = JSON.parse(cart_items)
    const isIndividual = purchase_type === 'individual'

    // Process each module in the cart
    for (const item of cartItemsData) {
      const { module_id, employee_count, price } = item

      console.log(`📚 Processing module: ${module_id}, type: ${purchase_type}, count: ${employee_count}, price: ${price}`)

      // 1. Process revenue distribution
      await processRevenueDistribution(supabaseClient, module_id, corporate_account_id, price)

      // 2. Create enrollments
      await createEnrollments(supabaseClient, {
        moduleId: module_id,
        userId: user_id,
        corporateAccountId: corporate_account_id,
        isIndividual,
        price: parseFloat(price)
      })
    }

    // 3. Track promo code usage
    if (has_discount === 'true' && promo_codes) {
      await trackPromoCodeUsage(supabaseClient, {
        promoCodes: promo_codes,
        userId: user_id,
        totalAmount: total_amount,
        sessionId: session.id,
        finalTotal: session.amount_total ? session.amount_total / 100 : 0,
        cartItems: cartItemsData
      })
    }

    // 4. Clear the cart
    await clearCart(supabaseClient, {
      userId: user_id,
      corporateAccountId: corporate_account_id,
      isIndividual
    })

    console.log(`🎉 WEBHOOK: ${isIndividual ? 'Individual' : 'Corporate'} module purchase completed successfully`)
  } catch (error: any) {
    console.error('💥 WEBHOOK CRITICAL ERROR in handleModulePurchase:', {
      error_message: error.message,
      error_stack: error.stack,
      error_details: error
    })
    // Re-throw to ensure Stripe knows the webhook failed
    throw error
  }
}

/**
 * Process revenue distribution for a module sale
 */
async function processRevenueDistribution(
  supabaseClient: ReturnType<typeof getSupabase>,
  moduleId: string,
  corporateAccountId: string | undefined,
  price: string
) {
  const { data: saleData, error: saleError } = await (supabaseClient as any).rpc('process_module_sale', {
    p_module_id: moduleId,
    p_corporate_account_id: corporateAccountId || null,
    p_total_amount: parseFloat(price),
    p_creator_donates: false
  })

  if (saleError) {
    console.error('❌ Error processing module sale:', saleError)
    throw new Error(`Failed to process revenue distribution: ${saleError.message}`)
  }

  console.log('✅ Module sale processed:', saleData)
}

/**
 * Create enrollments for individual or corporate purchase
 */
async function createEnrollments(
  supabaseClient: ReturnType<typeof getSupabase>,
  options: {
    moduleId: string
    userId: string
    corporateAccountId?: string
    isIndividual: boolean
    price: number
  }
) {
  const { moduleId, userId, corporateAccountId, isIndividual, price } = options

  if (isIndividual) {
    // INDIVIDUAL PURCHASE: Enroll just the user
    console.log(`👤 WEBHOOK: Enrolling individual user: ${userId}`)

    // Check if already enrolled
    const { data: existingEnrollment } = await supabaseClient
      .from('course_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .is('course_id', null)
      .single()

    if (existingEnrollment) {
      console.log(`ℹ️ WEBHOOK: User already enrolled in module ${moduleId}, skipping`)
      return
    }

    const enrollmentData = {
      user_id: userId,
      corporate_account_id: null,
      course_id: null,  // NULL for individual modules
      module_id: moduleId,  // UUID of marketplace module
      purchase_type: 'individual',
      purchased_at: new Date().toISOString(),
      purchase_price_snapshot: price,
      status: 'not_started',
      progress_percentage: 0,  // PHASE 3: Use standardized field
      completion_percentage: 0,  // Keep for backward compatibility (trigger will sync)
      completed: false,
      xp_earned: 0,
      started_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    }

    const { data: enrollResult, error: enrollError } = await (supabaseClient as any)
      .from('course_enrollments')
      .insert(enrollmentData)
      .select()

    if (enrollError) {
      console.error('❌ WEBHOOK ERROR: Failed to enroll individual user', {
        error: enrollError,
        error_message: enrollError.message,
        error_details: enrollError.details,
        error_hint: enrollError.hint,
        error_code: enrollError.code,
        enrollment_data: enrollmentData
      })
      throw new Error(`Failed to enroll user: ${enrollError.message}`)
    }

    console.log(`✅ WEBHOOK: Successfully enrolled individual user in module ${moduleId}`, enrollResult)
  } else {
    // CORPORATE PURCHASE: Enroll all employees
    console.log(`🏢 Enrolling corporate employees for account: ${corporateAccountId}`)

    // Fetch all employees for this corporate account
    const { data: employees, error: employeesError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('corporate_account_id', corporateAccountId!)
      .eq('is_corporate_user', true)

    if (employeesError) {
      console.error('❌ Error fetching employees:', employeesError)
      throw new Error(`Failed to fetch employees: ${employeesError.message}`)
    }

    console.log(`👥 Found ${employees?.length || 0} employees to enroll`)

    if (employees && employees.length > 0) {
      // Enroll each employee individually with duplicate check
      for (const employee of employees as Array<{ id: string }>) {
        // Check if already enrolled
        const { data: existingEnrollment } = await supabaseClient
          .from('course_enrollments')
          .select('id')
          .eq('user_id', employee.id)
          .eq('module_id', moduleId)
          .is('course_id', null)
          .single()

        if (existingEnrollment) {
          console.log(`ℹ️ Employee ${employee.id} already enrolled, skipping`)
          continue
        }

        const enrollmentData = {
          user_id: employee.id,
          corporate_account_id: corporateAccountId,
          course_id: null,  // NULL for individual modules
          module_id: moduleId,  // UUID of marketplace module
          purchase_type: 'corporate',
          purchased_at: new Date().toISOString(),
          purchase_price_snapshot: price,
          status: 'not_started',
          progress_percentage: 0,  // PHASE 3: Use standardized field
          completion_percentage: 0,  // Keep for backward compatibility (trigger will sync)
          completed: false,
          xp_earned: 0,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString()
        }

        const { error: enrollError } = await (supabaseClient as any)
          .from('course_enrollments')
          .insert(enrollmentData)

        if (enrollError) {
          console.error(`❌ Error enrolling employee ${employee.id}:`, enrollError)
          // Continue with next employee even if this one fails
        } else {
          console.log(`✅ Enrolled employee ${employee.id} in module ${moduleId}`)
        }
      }
    }
  }
}

/**
 * Track promo code usage
 */
async function trackPromoCodeUsage(
  supabaseClient: ReturnType<typeof getSupabase>,
  options: {
    promoCodes: string
    userId: string
    totalAmount?: string
    sessionId: string
    finalTotal: number
    cartItems: any[]
  }
) {
  const { promoCodes, userId, totalAmount, sessionId, finalTotal, cartItems } = options

  console.log('🎟️ WEBHOOK: Processing promo code usage...')
  
  try {
    const promoCodesData = JSON.parse(promoCodes)
    
    // Calculate total before and after discount
    const originalTotal = parseFloat(totalAmount || '0')
    const totalDiscount = originalTotal - finalTotal
    
    console.log('💰 Discount calculation:', {
      originalTotal,
      finalTotal,
      totalDiscount,
      promoCodesCount: promoCodesData.length
    })
    
    for (const promoCodeInfo of promoCodesData) {
      const { code } = promoCodeInfo
      
      // Get promo code ID from database
      const { data: promoCodeRecord } = await (supabaseClient as any)
        .from('promo_codes')
        .select('id')
        .eq('code', code)
        .single()
      
      if (promoCodeRecord) {
        // Insert into promo_code_uses
        const { error: useError } = await (supabaseClient as any)
          .from('promo_code_uses')
          .insert({
            promo_code_id: promoCodeRecord.id,
            user_id: userId,
            cart_total_before_discount: originalTotal,
            discount_amount: totalDiscount / promoCodesData.length, // Distribute discount across codes
            cart_total_after_discount: finalTotal,
            modules_purchased: cartItems, // JSONB - store as object, not string
            stripe_session_id: sessionId,
            used_at: new Date().toISOString()
          })
        
        if (useError) {
          console.error(`❌ Error creating promo_code_uses record for ${code}:`, useError)
        } else {
          console.log(`✅ Created promo_code_uses record for ${code}`)
        }
        
        // Increment current_uses on promo_codes table
        const { error: incrementError } = await (supabaseClient as any)
          .rpc('increment_promo_code_uses', { promo_id: promoCodeRecord.id })
        
        if (incrementError) {
          console.error(`❌ Error incrementing current_uses for ${code}:`, incrementError)
        } else {
          console.log(`✅ Incremented current_uses for ${code}`)
        }
      } else {
        console.warn(`⚠️ Promo code ${code} not found in database`)
      }
    }
    
    console.log('✅ Promo code tracking completed')
  } catch (promoError: any) {
    console.error('❌ Error processing promo code usage:', promoError)
    // Don't throw - continue with cart clearing even if promo tracking fails
  }
}

/**
 * Clear the cart after successful purchase
 */
async function clearCart(
  supabaseClient: ReturnType<typeof getSupabase>,
  options: {
    userId: string
    corporateAccountId?: string
    isIndividual: boolean
  }
) {
  const { userId, corporateAccountId, isIndividual } = options

  let clearCartQuery = supabaseClient.from('cart_items').delete()

  if (isIndividual) {
    clearCartQuery = clearCartQuery.eq('user_id', userId)
  } else {
    clearCartQuery = clearCartQuery.eq('corporate_account_id', corporateAccountId!)
  }

  const { error: clearCartError } = await clearCartQuery

  if (clearCartError) {
    console.error('❌ Error clearing cart:', clearCartError)
    throw new Error(`Failed to clear cart: ${clearCartError.message}`)
  }

  console.log('✅ Cart cleared')
}

