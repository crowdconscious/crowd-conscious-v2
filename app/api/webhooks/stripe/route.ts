import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'
import type { Database } from '@/types/database'

// Initialize Stripe lazily to avoid build-time errors
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil'
    })
  }
  return stripe
}

// Initialize Supabase lazily to avoid build-time errors
let supabase: SupabaseClient<Database> | null = null

function getSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are not set')
    }
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return supabase
}

// Handle module purchase after successful payment
async function handleModulePurchase(session: Stripe.Checkout.Session) {
  try {
    console.log('🎯 WEBHOOK: handleModulePurchase called')
    console.log('🎯 WEBHOOK: Session ID:', session.id)
    console.log('🎯 WEBHOOK: Payment status:', session.payment_status)
    
    const supabaseClient = getSupabase()
    const {
      purchase_type, // NEW: 'individual' or 'corporate'
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

      // 1. Call process_module_sale() RPC function for revenue distribution
      const { data: saleData, error: saleError } = await (supabaseClient as any).rpc('process_module_sale', {
        p_module_id: module_id,
        p_corporate_account_id: corporate_account_id || null,
        p_total_amount: parseFloat(price),
        p_creator_donates: false
      })

      if (saleError) {
        console.error('❌ Error processing module sale:', saleError)
        // Continue with next module even if this one fails
        continue
      }

      console.log('✅ Module sale processed:', saleData)

      // 2. Create enrollments based on purchase type
      if (isIndividual) {
        // INDIVIDUAL PURCHASE: Enroll just the user
        console.log(`👤 WEBHOOK: Enrolling individual user: ${user_id}`)

        // ⚠️ CRITICAL: For individual modules, set course_id = NULL, module_id = UUID
        // course_id is FK to 'courses' table (multi-module programs)
        // module_id is FK to 'marketplace_modules' table (individual modules)
        const enrollmentData = {
          user_id: user_id,
          corporate_account_id: null,
          course_id: null,  // ✅ NULL for individual modules
          module_id: module_id,  // ✅ UUID of marketplace module
          purchase_type: 'individual',
          purchased_at: new Date().toISOString(),
          purchase_price_snapshot: parseFloat(price),
          status: 'not_started',
          progress_percentage: 0,  // ✅ PHASE 3: Use standardized field
          completion_percentage: 0,  // Keep for backward compatibility (trigger will sync)
          completed: false,
          xp_earned: 0,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString()
        }

        console.log('📝 WEBHOOK: Enrollment data to insert:', enrollmentData)

        // Check if already enrolled (since unique constraint is on user_id, course_id which are both NULL-able)
        const { data: existingEnrollment } = await supabaseClient
          .from('course_enrollments')
          .select('id')
          .eq('user_id', user_id)
          .eq('module_id', module_id)
          .is('course_id', null)
          .single()

        if (existingEnrollment) {
          console.log(`ℹ️ WEBHOOK: User already enrolled in module ${module_id}, skipping`)
          continue
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
        } else {
          console.log(`✅ WEBHOOK: Successfully enrolled individual user in module ${module_id}`, enrollResult)
        }
      } else {
        // CORPORATE PURCHASE: Enroll all employees
        console.log(`🏢 Enrolling corporate employees for account: ${corporate_account_id}`)

        // Fetch all employees for this corporate account
        const { data: employees, error: employeesError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('corporate_account_id', corporate_account_id)
          .eq('is_corporate_user', true)

        if (employeesError) {
          console.error('❌ Error fetching employees:', employeesError)
          continue
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
              .eq('module_id', module_id)
              .is('course_id', null)
              .single()

            if (existingEnrollment) {
              console.log(`ℹ️ Employee ${employee.id} already enrolled, skipping`)
              continue
            }

            const enrollmentData = {
              user_id: employee.id,
              corporate_account_id: corporate_account_id,
              course_id: null,  // ✅ NULL for individual modules
              module_id: module_id,  // ✅ UUID of marketplace module
              purchase_type: 'corporate',
              purchased_at: new Date().toISOString(),
              purchase_price_snapshot: parseFloat(price),
              status: 'not_started',
              progress_percentage: 0,  // ✅ PHASE 3: Use standardized field
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
            } else {
              console.log(`✅ Enrolled employee ${employee.id} in module ${module_id}`)
            }
          }
        }
      }
    }

    // 3. Track promo code usage
    if (has_discount === 'true' && promo_codes) {
      console.log('🎟️ WEBHOOK: Processing promo code usage...')
      
      try {
        const promoCodesData = JSON.parse(promo_codes)
        
        // Calculate total before and after discount
        const originalTotal = parseFloat(total_amount) || 0
        const finalTotal = session.amount_total ? session.amount_total / 100 : 0 // Stripe amount is in cents
        const totalDiscount = originalTotal - finalTotal
        
        console.log('💰 Discount calculation:', {
          originalTotal,
          finalTotal,
          totalDiscount,
          promoCodesCount: promoCodesData.length
        })
        
        for (const promoCodeInfo of promoCodesData) {
          const { code, module_id } = promoCodeInfo
          
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
                user_id: user_id,
                cart_total_before_discount: originalTotal,
                discount_amount: totalDiscount / promoCodesData.length, // Distribute discount across codes
                cart_total_after_discount: finalTotal,
                modules_purchased: cartItemsData, // JSONB - store as object, not string
                stripe_session_id: session.id,
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

    // 4. Clear the cart (based on purchase type)
    let clearCartQuery = supabaseClient.from('cart_items').delete()

    if (isIndividual) {
      clearCartQuery = clearCartQuery.eq('user_id', user_id)
    } else {
      clearCartQuery = clearCartQuery.eq('corporate_account_id', corporate_account_id!)
    }

    const { error: clearCartError } = await clearCartQuery

    if (clearCartError) {
      console.error('❌ Error clearing cart:', clearCartError)
    } else {
      console.log('✅ Cart cleared')
    }

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

export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook received')
  console.log('🔍 Environment check:', {
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    nodeEnv: process.env.NODE_ENV
  })

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('📦 Request details:', {
    bodyLength: body.length,
    hasSignature: !!signature,
    signaturePreview: signature?.substring(0, 20) + '...'
  })

  if (!signature) {
    console.error('❌ No signature provided')
    return ApiResponse.badRequest('No signature provided', 'MISSING_WEBHOOK_SIGNATURE')
  }

  let event: Stripe.Event

  try {
    const stripeClient = getStripe()
    console.log('🔐 Verifying webhook signature...')
    
    event = stripeClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    
    console.log('✅ Webhook signature verified successfully')
    console.log('📋 Event type:', event.type)
    console.log('🆔 Event ID:', event.id)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    console.error('🔍 Error details:', {
      name: err.name,
      type: err.type,
      message: err.message
    })
    return ApiResponse.badRequest(`Webhook Error: ${err.message}`, 'WEBHOOK_SIGNATURE_ERROR')
  }

  // Handle the event
  console.log('⚡ Processing event:', event.type)
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      console.log('💳 Checkout session completed:', {
        sessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_email
      })

      // Check if this is a module purchase
      const { type: purchaseType } = session.metadata || {}
      
      if (purchaseType === 'module_purchase') {
        console.log('📚 Processing module purchase...')
        await handleModulePurchase(session)
        break
      }

      // Otherwise, handle as sponsorship (legacy flow)
      const { 
        sponsorshipId, 
        sponsorType, 
        brandName, 
        taxReceipt,
        platformFeeAmount,
        founderAmount,
        connectedAccountId,
        coverPlatformFee,
        originalSponsorshipAmount
      } = session.metadata || {}
      
      console.log('📝 Session metadata:', {
        sponsorshipId,
        sponsorType,
        brandName,
        taxReceipt,
        platformFeeAmount,
        founderAmount,
        hasConnectedAccount: !!connectedAccountId,
        coverPlatformFee: coverPlatformFee === 'yes',
        originalSponsorshipAmount
      })

      if (sponsorshipId) {
        console.log('🔄 Updating sponsorship:', sponsorshipId)
        
        const updateData: any = {
          status: 'paid',
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          paid_at: new Date().toISOString(),
          platform_fee_amount: platformFeeAmount ? parseFloat(platformFeeAmount) : null,
          founder_amount: founderAmount ? parseFloat(founderAmount) : null
        }
        
        // If payment was made via Connect, get the transfer ID
        if (connectedAccountId && session.payment_intent) {
          try {
            const stripeClient = getStripe()
            const paymentIntent = await stripeClient.paymentIntents.retrieve(
              session.payment_intent as string,
              { expand: ['transfer_data'] }
            )
            
            if (paymentIntent.transfer_data?.destination) {
              updateData.stripe_transfer_id = paymentIntent.transfer_data.destination
              console.log('✅ Found transfer ID:', updateData.stripe_transfer_id)
            }
          } catch (transferError) {
            console.error('⚠️ Error retrieving transfer data:', transferError)
            // Continue anyway - not critical
          }
        }
        
        const supabaseClient = getSupabase()
        const { error } = await (supabaseClient as any)
          .from('sponsorships')
          .update(updateData)
          .eq('id', sponsorshipId)

        if (error) {
          console.error('❌ Failed to update sponsorship:', error)
          console.error('🔍 Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          })
          return ApiResponse.serverError('Failed to update sponsorship', 'SPONSORSHIP_UPDATE_ERROR', { message: error.message })
        }

        console.log('✅ Sponsorship updated successfully:', sponsorshipId)
        
        if (connectedAccountId) {
          console.log('💰 Payment split:', {
            total: session.amount_total,
            platformFee: platformFeeAmount,
            founderPayout: founderAmount,
            destination: connectedAccountId,
            feeCoveredBySponsor: coverPlatformFee === 'yes',
            originalAmount: originalSponsorshipAmount
          })
        }
        
        // Log extra generosity if platform fee was covered
        if (coverPlatformFee === 'yes') {
          console.log('💚 Generous sponsor covered the platform fee! Creator receives 100% of sponsorship amount.')
        }

        // Refresh materialized view for trusted brands
        if (sponsorType === 'business' && brandName) {
          console.log('🔄 Refreshing trusted brands view...')
          const { error: refreshError } = await supabaseClient.rpc('refresh_trusted_brands')
          if (refreshError) {
            console.error('⚠️ Failed to refresh trusted brands:', refreshError)
          } else {
            console.log('✅ Trusted brands view refreshed')
          }
        }

        // Send confirmation email (implement later)
        // await sendSponsorshipConfirmationEmail(...)

        console.log('🎉 Webhook processing completed successfully')
      } else if (session.metadata?.type === 'treasury_donation') {
        // Handle treasury donation
        console.log('💰 Processing treasury donation')
        const { community_id, donor_id, donor_email, donor_name, amount } = session.metadata
        
        if (community_id && amount) {
          try {
            const supabaseClient = getSupabase()
            
            // Add donation to treasury using RPC function
            const { data, error } = await (supabaseClient as any).rpc('add_treasury_donation', {
              p_community_id: community_id,
              p_amount: parseFloat(amount),
              p_donor_id: donor_id || null,
              p_donor_email: donor_email || session.customer_email || null,
              p_donor_name: donor_name || null,
              p_stripe_payment_intent_id: session.payment_intent as string || null,
              p_description: `Donation to community pool via Stripe`
            })
            
            if (error) {
              console.error('❌ Failed to add treasury donation:', error)
              return ApiResponse.serverError('Failed to add treasury donation', 'TREASURY_DONATION_ERROR', { message: error.message })
            }
            
            console.log('✅ Treasury donation added successfully:', data)
            console.log('🎉 Treasury webhook processing completed successfully')
          } catch (treasuryError: any) {
            console.error('❌ Treasury donation error:', treasuryError)
            return ApiResponse.serverError('Treasury donation processing failed', 'TREASURY_DONATION_SERVER_ERROR', { message: treasuryError.message })
          }
        } else {
          console.warn('⚠️ Missing required metadata for treasury donation')
        }
      } else {
        console.warn('⚠️ No sponsorshipId in metadata and not a treasury donation')
      }
      break

    case 'payment_intent.succeeded':
      console.log('💰 Payment succeeded:', event.data.object.id)
      break

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as any
      console.log('❌ Payment failed:', {
        intentId: failedIntent.id,
        amount: failedIntent.amount,
        currency: failedIntent.currency,
        lastError: failedIntent.last_payment_error
      })
      break

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`)
  }

  console.log('✅ Webhook response sent')
  return ApiResponse.ok({ received: true })
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false
  }
}