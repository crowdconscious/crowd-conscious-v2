import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmployeeInvitationEmail } from '@/lib/resend'
import crypto from 'crypto'

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
    const { emails, corporate_account_id, invited_by_id } = body

    // Validate input
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere al menos un email' },
        { status: 400 }
      )
    }

    if (!corporate_account_id) {
      return NextResponse.json(
        { error: 'corporate_account_id requerido' },
        { status: 400 }
      )
    }

    // Get corporate account info
    const { data: corporateAccount, error: accountError } = await supabaseAdmin
      .from('corporate_accounts')
      .select('company_name, employee_limit, modules_included')
      .eq('id', corporate_account_id)
      .single()

    if (accountError || !corporateAccount) {
      return NextResponse.json(
        { error: 'Cuenta corporativa no encontrada' },
        { status: 404 }
      )
    }

    // Get inviter info
    const { data: inviter } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', invited_by_id)
      .single()

    const inviterName = inviter?.full_name || inviter?.email || 'Tu empresa'

    // Check current employee count
    const { count: currentEmployees } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('corporate_account_id', corporate_account_id)
      .eq('is_corporate_user', true)

    const remainingSlots = corporateAccount.employee_limit - (currentEmployees || 0)

    if (remainingSlots < emails.length) {
      return NextResponse.json(
        { 
          error: `Solo tienes ${remainingSlots} espacios disponibles. Límite: ${corporateAccount.employee_limit}` 
        },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (const emailData of emails) {
      const email = typeof emailData === 'string' ? emailData : emailData.email
      const full_name = typeof emailData === 'object' ? emailData.full_name : null

      try {
        // Check if already invited or registered
        const { data: existingInvite } = await supabaseAdmin
          .from('employee_invitations')
          .select('id, status')
          .eq('corporate_account_id', corporate_account_id)
          .eq('email', email)
          .single()

        if (existingInvite) {
          if (existingInvite.status === 'accepted') {
            errors.push({ email, error: 'Ya está registrado' })
            continue
          }
          // Update existing invitation
          const newToken = crypto.randomBytes(32).toString('hex')
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

          await supabaseAdmin
            .from('employee_invitations')
            .update({
              invitation_token: newToken,
              expires_at: expiresAt.toISOString(),
              status: 'pending',
              sent_at: new Date().toISOString(),
              full_name: full_name || existingInvite.full_name
            })
            .eq('id', existingInvite.id)

          // Send email
          await sendEmployeeInvitationEmail(
            email,
            corporateAccount.company_name,
            inviterName,
            newToken
          )

          results.push({ email, status: 'reinvited' })
        } else {
          // Create new invitation
          const invitationToken = crypto.randomBytes(32).toString('hex')
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

          const { error: inviteError } = await supabaseAdmin
            .from('employee_invitations')
            .insert({
              corporate_account_id,
              email,
              full_name,
              invitation_token: invitationToken,
              expires_at: expiresAt.toISOString(),
              invited_by: invited_by_id,
              status: 'pending'
            })

          if (inviteError) {
            errors.push({ email, error: inviteError.message })
            continue
          }

          // Send invitation email
          await sendEmployeeInvitationEmail(
            email,
            corporateAccount.company_name,
            inviterName,
            invitationToken
          )

          results.push({ email, status: 'invited' })

          // Log activity
          await supabaseAdmin.rpc('log_corporate_activity', {
            p_corporate_account_id: corporate_account_id,
            p_action_type: 'employee_invited',
            p_action_details: { email, invited_by: invited_by_id }
          }).catch(() => {}) // Ignore logging errors
        }
      } catch (error: any) {
        errors.push({ email, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      invited: results.length,
      errors: errors.length,
      results,
      errors
    })

  } catch (error: any) {
    console.error('Invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar invitaciones' },
      { status: 500 }
    )
  }
}

// GET - List all invitations for a corporate account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const corporate_account_id = searchParams.get('corporate_account_id')

    if (!corporate_account_id) {
      return NextResponse.json(
        { error: 'corporate_account_id requerido' },
        { status: 400 }
      )
    }

    const { data: invitations, error } = await supabaseAdmin
      .from('employee_invitations')
      .select('*')
      .eq('corporate_account_id', corporate_account_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ invitations })

  } catch (error: any) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener invitaciones' },
      { status: 500 }
    )
  }
}

