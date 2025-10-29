import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, full_name } = body

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y contraseña requeridos' },
        { status: 400 }
      )
    }

    // Find invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('employee_invitations')
      .select('*, corporate_accounts(company_name, modules_included)')
      .eq('invitation_token', token)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invitación no válida' },
        { status: 404 }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Esta invitación ha expirado' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'Esta invitación ya fue aceptada' },
        { status: 400 }
      )
    }

    // Create user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || invitation.full_name || invitation.email.split('@')[0],
        is_corporate_user: true,
        corporate_role: 'employee'
      }
    })

    if (authError || !authData.user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Error al crear cuenta' },
        { status: 400 }
      )
    }

    // Wait a moment for profile trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))

    // Upsert profile with corporate info (in case trigger hasn't run yet)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: full_name || invitation.full_name || invitation.email.split('@')[0],
        email: invitation.email,
        corporate_account_id: invitation.corporate_account_id,
        corporate_role: 'employee',
        is_corporate_user: true,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Don't fail the entire operation if profile update fails
    }

    // Auto-enroll in modules
    try {
      await supabaseAdmin.rpc('auto_enroll_employee', {
        p_employee_id: authData.user.id,
        p_corporate_account_id: invitation.corporate_account_id
      })
    } catch (enrollError) {
      console.error('Auto-enroll error:', enrollError)
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('employee_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    // Log activity
    try {
      await supabaseAdmin.rpc('log_corporate_activity', {
        p_corporate_account_id: invitation.corporate_account_id,
        p_action_type: 'employee_accepted',
        p_action_details: { email: invitation.email, user_id: authData.user.id }
      })
    } catch (logError) {
      console.error('Log error:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente',
      user_id: authData.user.id
    })

  } catch (error: any) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al aceptar invitación' },
      { status: 500 }
    )
  }
}

// GET - Validate invitation token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requerido' },
        { status: 400 }
      )
    }

    // Find invitation
    const { data: invitation, error } = await supabaseAdmin
      .from('employee_invitations')
      .select('id, email, full_name, status, expires_at, corporate_accounts(company_name)')
      .eq('invitation_token', token)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { valid: false, error: 'Invitación no encontrada' },
        { status: 404 }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Invitación expirada' },
        { status: 400 }
      )
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { valid: false, error: 'Ya aceptada' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        full_name: invitation.full_name,
        company_name: (invitation as any).corporate_accounts?.company_name
      }
    })

  } catch (error: any) {
    console.error('Validate token error:', error)
    return NextResponse.json(
      { valid: false, error: error.message },
      { status: 500 }
    )
  }
}

