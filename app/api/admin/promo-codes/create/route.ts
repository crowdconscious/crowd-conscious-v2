import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to create promo codes')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.email === 'francisco@crowdconscious.app' || profile?.role === 'admin'

    if (!isAdmin) {
      console.error('User is not admin:', { email: profile?.email, role: profile?.role })
      return ApiResponse.forbidden('You must be an administrator to create promo codes', 'NOT_ADMIN')
    }

    console.log('✅ Admin check passed for user:', profile?.email)

    const body = await request.json()
    console.log('📥 Received payload:', body)
    
    const adminClient = createAdminClient()

    // Prepare insert data
    const insertData = {
      code: body.code.toUpperCase().trim(),
      description: body.description || null,
      discount_type: body.discount_type,
      discount_value: body.discount_type === 'free' ? 100 : body.discount_value,
      max_uses: body.max_uses || null,
      max_uses_per_user: body.max_uses_per_user || 1,
      valid_until: body.valid_until || null,
      partner_name: body.partner_name || null,
      campaign_name: body.campaign_name || null,
      minimum_purchase_amount: body.minimum_purchase_amount || 0,
      notes: body.notes || null,
      created_by: user.id,
      active: true
    }

    console.log('💾 Inserting into database:', insertData)

    // Insert promo code
    const { data: promoCode, error } = await adminClient
      .from('promo_codes')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error creating promo code:', error)
      return ApiResponse.badRequest(
        error.message || 'Failed to create promo code',
        'PROMO_CODE_CREATION_ERROR',
        { details: error.details || error.hint || 'No additional details' }
      )
    }

    console.log('✅ Promo code created successfully:', promoCode)
    return ApiResponse.created({ promoCode })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return ApiResponse.serverError('Internal server error', 'PROMO_CODE_SERVER_ERROR', { message: error.message })
  }
}

