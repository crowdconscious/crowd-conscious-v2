import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { moduleId, moduleName, xpEarned } = body

    if (!moduleId || !moduleName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's profile and corporate account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, corporate_account_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get corporate account
    const { data: corporateAccount, error: corpError } = await supabase
      .from('corporate_accounts')
      .select('company_name')
      .eq('id', profile.corporate_account_id)
      .single()

    if (corpError || !corporateAccount) {
      console.error('Corporate account error:', corpError)
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 })
    }

    // Check if certificate already exists for this module
    const { data: existingCert } = await supabase
      .from('certifications')
      .select('id, certificate_url, verification_code')
      .eq('employee_id', user.id)
      .eq('corporate_account_id', profile.corporate_account_id)
      .contains('modules_completed', [moduleId])
      .single()

    if (existingCert) {
      return NextResponse.json({
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
        corporate_account_id: profile.corporate_account_id,
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
      return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 })
    }

    // Return certificate data
    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        verificationCode,
        certificateUrl,
        employeeName: profile.full_name,
        companyName: corporateAccount.company_name,
        moduleName,
        xpEarned,
        issuedAt: certificate.issued_at
      }
    })

  } catch (error: any) {
    console.error('Certificate generation error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

