import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const { data: assessment, error } = await supabaseAdmin
      .from('company_assessments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error('Assessment not found')
    }

    // Return the stored assessment data
    // In production, you'd also fetch related company data if it exists
    return NextResponse.json({
      companyName: 'Tu Empresa', // Would come from assessment
      contact: {
        fullName: 'Contact Name',
        email: 'contact@email.com',
      },
      roi: {
        totalSavings: 150000,
        breakdown: {
          energy: 45000,
          water: 22000,
          waste: 18000,
          productivity: 65000,
        },
        metrics: {
          energyReduction: '20%',
          waterReduction: '18%',
          wasteReduction: '25%',
          satisfactionIncrease: '35%',
        }
      },
      modules: assessment.recommended_modules || [],
      pricing: {
        tier: assessment.recommended_program || 'completo',
        basePrice: assessment.recommended_program === 'inicial' ? 45000 : 
                  assessment.recommended_program === 'elite' ? 350000 : 125000,
        pricePerModule: assessment.recommended_program === 'inicial' ? 15000 : 
                        assessment.recommended_program === 'elite' ? 58333 : 20833,
        moduleCount: assessment.recommended_modules?.length || 6,
        employeeLimit: assessment.recommended_program === 'inicial' ? 30 : 
                      assessment.recommended_program === 'elite' ? 999 : 100,
      }
    })
  } catch (error: any) {
    console.error('Error fetching assessment:', error)
    return NextResponse.json(
      { error: error.message || 'Error fetching proposal' },
      { status: 500 }
    )
  }
}

