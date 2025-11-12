import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to toggle promo codes')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.email === 'francisco@crowdconscious.app'

    if (!isAdmin) {
      return ApiResponse.forbidden('Admin access required', 'NOT_ADMIN')
    }

    const { id, active } = await request.json()

    if (!id || active === undefined) {
      return ApiResponse.badRequest('id and active are required', 'MISSING_REQUIRED_FIELDS')
    }

    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('promo_codes')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return ApiResponse.badRequest(error.message, 'PROMO_CODE_UPDATE_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ success: true })
  } catch (error: any) {
    console.error('Error toggling promo code:', error)
    return ApiResponse.serverError('Internal server error', 'PROMO_CODE_TOGGLE_SERVER_ERROR', { message: error.message })
  }
}

