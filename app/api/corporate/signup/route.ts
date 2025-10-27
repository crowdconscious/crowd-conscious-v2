import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
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

    // Create corporate account with minimal required fields
    // Only include fields that definitely exist in the database
    const insertData: any = {
      company_name: companyName,
      program_tier: programTier,
      employee_limit: tierDetails.employee_limit,
      admin_user_id: userId,
    }

    // Add optional fields if they exist in your schema
    // If these cause errors, comment them out
    if (industry) insertData.industry = industry
    if (employeeCount) insertData.employee_count = parseInt(employeeCount)
    if (address) insertData.address = address
    if (phone) insertData.phone = phone

    const { data: corporateAccount, error: corporateError } = await supabaseAdmin
      .from('corporate_accounts')
      .insert(insertData)
      .select()
      .single()

    if (corporateError) {
      console.error('Corporate account error:', corporateError)
      // Clean up user if corporate account creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Error al crear cuenta corporativa' },
        { status: 500 }
      )
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

    return NextResponse.json({
      success: true,
      corporate_account_id: corporateAccount.id,
      user_id: userId,
      message: 'Cuenta creada exitosamente',
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear cuenta' },
      { status: 500 }
    )
  }
}

