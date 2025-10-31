import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all certificates for this user
    const { data: certificates, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('employee_id', user.id)
      .eq('certification_type', 'module_completion')
      .order('issued_at', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
      return NextResponse.json({ certificates: [] })
    }

    // Map to friendly format
    const formattedCerts = certificates.map(cert => {
      // Extract module info from modules_completed array
      const moduleId = cert.modules_completed?.[0] || 'unknown'
      let moduleName = 'Módulo Completado'
      
      // Map module IDs to names
      if (moduleId === 'clean_air') {
        moduleName = 'Aire Limpio para Todos'
      } else if (moduleId === 'clean_water') {
        moduleName = 'Agua Limpia y Vida'
      } else if (moduleId === 'zero_waste') {
        moduleName = 'Cero Residuos'
      }

      return {
        id: cert.id,
        moduleId,
        moduleName,
        verificationCode: cert.verification_code,
        issuedAt: cert.issued_at,
        certificateUrl: cert.certificate_url,
        xpEarned: 750 // Default for now, can be calculated from enrollment data
      }
    })

    return NextResponse.json({
      certificates: formattedCerts
    })

  } catch (error: any) {
    console.error('Error in my-certificates API:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

