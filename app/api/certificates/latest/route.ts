import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, corporate_account_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get corporate account
    const { data: corporateAccount } = await supabase
      .from('corporate_accounts')
      .select('company_name')
      .eq('id', profile.corporate_account_id)
      .single()

    if (!corporateAccount) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 })
    }

    // Get latest certificate
    const { data: certificate, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('employee_id', user.id)
      .order('issued_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !certificate) {
      console.log('No certificate found, returning default data')
      // Return default data if no certificate exists yet
      return NextResponse.json({
        employeeName: profile.full_name,
        companyName: corporateAccount.company_name,
        verificationCode: 'PENDING',
        issuedAt: new Date().toISOString(),
        xpEarned: 0
      })
    }

    return NextResponse.json({
      id: certificate.id,
      employeeName: profile.full_name,
      companyName: corporateAccount.company_name,
      verificationCode: certificate.verification_code,
      certificateUrl: certificate.certificate_url,
      modulesCompleted: certificate.modules_completed,
      issuedAt: certificate.issued_at,
      xpEarned: 750 // Default XP for now
    })

  } catch (error: any) {
    console.error('Error fetching certificate:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

