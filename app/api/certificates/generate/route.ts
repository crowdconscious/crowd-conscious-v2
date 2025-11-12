import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to generate certificate')
    }

    const body = await req.json()
    const { moduleId, moduleName, xpEarned } = body

    if (!moduleId || !moduleName) {
      return ApiResponse.badRequest('Missing required fields', 'MISSING_REQUIRED_FIELDS')
    }

    // Get user's profile and corporate account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, corporate_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return ApiResponse.notFound('Profile', 'PROFILE_NOT_FOUND')
    }

    // Get corporate account (optional - may not exist for individual users)
    let corporateAccount = null
    if (profile.corporate_account_id) {
      const { data: corpAccount, error: corpError } = await supabase
        .from('corporate_accounts')
        .select('company_name')
        .eq('id', profile.corporate_account_id)
        .single()

      if (corpError) {
        console.error('Corporate account error:', corpError)
        // Don't fail if corporate account doesn't exist - individual users may not have one
      } else {
        corporateAccount = corpAccount
      }
    }

    // Check if certificate already exists for this module
    // Note: This uses the old 'certifications' table - may need to check course_enrollments instead
    const { data: existingCert } = await supabase
      .from('certifications')
      .select('id, certificate_url, verification_code')
      .eq('employee_id', user.id)
      .contains('modules_completed', [moduleId])
      .single()

    if (existingCert) {
      return ApiResponse.ok({
        message: 'Certificate already exists',
        certificate: existingCert
      })
    }

    // Generate verification code
    const verificationCode = Math.random().toString(36).substring(2, 14).toUpperCase()

    // Create certificate URL (will be used to generate PDF/image later)
    const certificateUrl = `/certificates/${verificationCode}`

    // Insert certificate record
    const { data: certificate, error: insertError } = await supabase
      .from('certifications')
      .insert({
        employee_id: user.id,
        corporate_account_id: profile.corporate_account_id || null,
        certification_type: 'module_completion',
        certification_level: 'participant',
        modules_completed: [moduleId],
        certificate_url: certificateUrl,
        verification_code: verificationCode,
        issued_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return ApiResponse.serverError('Failed to create certificate', 'CERTIFICATE_GENERATION_ERROR', { message: insertError.message })
    }

    // Return certificate data
    return ApiResponse.created({
      certificate: {
        id: certificate.id,
        verificationCode,
        certificateUrl,
        employeeName: profile.full_name,
        companyName: corporateAccount?.company_name || null,
        moduleName,
        xpEarned,
        issuedAt: certificate.issued_at
      }
    })

  } catch (error: any) {
    console.error('Certificate generation error:', error)
    return ApiResponse.serverError('Server error', 'CERTIFICATE_GENERATION_SERVER_ERROR', { message: error.message })
  }
}

