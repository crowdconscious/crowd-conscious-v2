import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'
import { sendEmployeeInvitationEmail } from '@/lib/resend'
import crypto from 'crypto'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { emails, corporate_account_id, invited_by_id } = body

    // Validate input
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return ApiResponse.badRequest('Se requiere al menos un email', 'MISSING_EMAILS')
    }

    if (!corporate_account_id) {
      return ApiResponse.badRequest('corporate_account_id requerido', 'MISSING_CORPORATE_ACCOUNT_ID')
    }

    // Get corporate account info
    const { data: corporateAccount, error: accountError } = await supabaseAdmin
      .from('corporate_accounts')
      .select('company_name, employee_limit, modules_included')
      .eq('id', corporate_account_id)
      .single()

    if (accountError || !corporateAccount) {
      return ApiResponse.notFound('Corporate account', 'CORPORATE_ACCOUNT_NOT_FOUND')
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
      return ApiResponse.badRequest(
        `Solo tienes ${remainingSlots} espacios disponibles. Límite: ${corporateAccount.employee_limit}`,
        'INSUFFICIENT_EMPLOYEE_SLOTS'
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
          .select('id, status, full_name')
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
          try {
            await supabaseAdmin.rpc('log_corporate_activity', {
              p_corporate_account_id: corporate_account_id,
              p_action_type: 'employee_invited',
              p_action_details: { email, invited_by: invited_by_id }
            })
          } catch (logError) {
            // Ignore logging errors
            console.log('Activity log skipped:', logError)
          }
        }
      } catch (error: any) {
        errors.push({ email, error: error.message })
      }
    }

    return ApiResponse.ok({
      invited: results.length,
      errorCount: errors.length,
      results,
      errors
    })

  } catch (error: any) {
    console.error('Invitation error:', error)
    return ApiResponse.serverError('Error al enviar invitaciones', 'INVITATION_ERROR', { message: error.message })
  }
}

// GET - List all invitations for a corporate account
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const corporate_account_id = searchParams.get('corporate_account_id')

    if (!corporate_account_id) {
      return ApiResponse.badRequest('corporate_account_id requerido', 'MISSING_CORPORATE_ACCOUNT_ID')
    }

    const { data: invitations, error } = await supabaseAdmin
      .from('employee_invitations')
      .select('*')
      .eq('corporate_account_id', corporate_account_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return ApiResponse.ok({ invitations })

  } catch (error: any) {
    console.error('Get invitations error:', error)
    return ApiResponse.serverError('Error al obtener invitaciones', 'INVITATIONS_FETCH_ERROR', { message: error.message })
  }
}

