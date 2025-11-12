import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'

// Get admin Supabase client
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    const body = await req.json()
    const {
      companyName,
      industry,
      employeeCount,
      address,
      fullName,
      email,
      password,
      phone,
      programTier,
    } = body

    // Validate required fields
    if (!companyName || !email || !password || !programTier) {
      return ApiResponse.badRequest('Faltan campos requeridos', 'MISSING_REQUIRED_FIELDS')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return ApiResponse.badRequest(authError.message, 'AUTH_ERROR', { code: authError.status })
    }

    const userId = authData.user.id

    // Determine program details based on tier
    const programDetails = {
      inicial: {
        employee_limit: 30,
        duration_months: 3,
        modules: ['clean_air', 'clean_water', 'safe_cities'],
        price: 45000,
      },
      completo: {
        employee_limit: 100,
        duration_months: 6,
        modules: ['clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'integration'],
        price: 125000,
      },
      elite: {
        employee_limit: 999,
        duration_months: 12,
        modules: ['clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'integration'],
        price: 350000,
      },
    }

    const tierDetails = programDetails[programTier as keyof typeof programDetails]

    // Create corporate account - matches exact database schema
    const { data: corporateAccount, error: corporateError } = await supabaseAdmin
      .from('corporate_accounts')
      .insert({
        company_name: companyName,
        industry: industry || null,
        employee_count: employeeCount ? parseInt(employeeCount) : null,
        address: address || null,
        program_tier: programTier,
        program_start_date: new Date().toISOString(),
        program_end_date: new Date(
          Date.now() + tierDetails.duration_months * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        employee_limit: tierDetails.employee_limit,
        modules_included: tierDetails.modules,
        certification_status: 'not_started',
        total_paid: 0,
        community_credits_balance: 0,
        admin_user_id: userId,
        hr_contact_email: email,
        billing_email: email,
      })
      .select()
      .single()

    if (corporateError) {
      console.error('Corporate account error:', corporateError)
      // Clean up user if corporate account creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return ApiResponse.serverError('Error al crear cuenta corporativa', 'CORPORATE_ACCOUNT_CREATION_ERROR', { message: corporateError.message })
    }

    // Update user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        is_corporate_user: true,
        corporate_account_id: corporateAccount.id,
        corporate_role: 'admin',
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    // TODO: Create Stripe checkout session for payment
    // For now, just return success

    return ApiResponse.created({
      corporate_account_id: corporateAccount.id,
      user_id: userId,
      message: 'Cuenta creada exitosamente',
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return ApiResponse.serverError('Error al crear cuenta', 'SIGNUP_SERVER_ERROR', { message: error.message })
  }
}

