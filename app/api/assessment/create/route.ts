import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAssessmentQuoteEmail } from '@/lib/resend'

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

// ROI Calculator based on industry and challenges
function calculateROI(formData: any) {
  const employeeCount = parseInt(formData.employeeCount.split('-')[0]) || 50
  
  let energySavings = 0
  let waterSavings = 0
  let wasteSavings = 0
  let productivityGain = 0

  // Energy savings calculation
  if (formData.challenges.includes('energy_consumption')) {
    const kwhPerEmployee = formData.industry === 'manufacturing' ? 200 : 120
    const costPerKwh = 0.15 // MXN
    const savingsPercent = 0.20 // 20% reduction
    energySavings = employeeCount * kwhPerEmployee * 12 * costPerKwh * savingsPercent
  }

  // Water savings
  if (formData.challenges.includes('water_usage')) {
    const litersPerEmployee = formData.industry === 'manufacturing' ? 3000 : 1500
    const costPerLiter = 0.03 // MXN
    const savingsPercent = 0.18 // 18% reduction
    waterSavings = employeeCount * litersPerEmployee * 12 * costPerLiter * savingsPercent
  }

  // Waste savings
  if (formData.challenges.includes('waste_management')) {
    const kgPerEmployee = formData.industry === 'manufacturing' ? 80 : 30
    const costPerKg = 0.30 // MXN
    const savingsPercent = 0.25 // 25% reduction
    wasteSavings = employeeCount * kgPerEmployee * 12 * costPerKg * savingsPercent
  }

  // Productivity/engagement gains
  if (formData.challenges.includes('employee_engagement')) {
    const avgSalary = 15000 // MXN per month
    const productivityIncrease = 0.10 // 10% productivity boost
    productivityGain = employeeCount * avgSalary * 12 * productivityIncrease
  }

  const totalSavings = energySavings + waterSavings + wasteSavings + productivityGain

  return {
    totalSavings: Math.round(totalSavings),
    breakdown: {
      energy: Math.round(energySavings),
      water: Math.round(waterSavings),
      waste: Math.round(wasteSavings),
      productivity: Math.round(productivityGain),
    },
    metrics: {
      energyReduction: formData.challenges.includes('energy_consumption') ? '20%' : '0%',
      waterReduction: formData.challenges.includes('water_usage') ? '18%' : '0%',
      wasteReduction: formData.challenges.includes('waste_management') ? '25%' : '0%',
      satisfactionIncrease: formData.challenges.includes('employee_engagement') ? '35%' : '0%',
    }
  }
}

// Module recommendation engine
function recommendModules(formData: any) {
  const allModules = [
    {
      id: 'clean_air',
      name: 'Aire Limpio',
      relevance: 0,
      challenges: ['energy_consumption', 'esg_compliance', 'community_relations'],
      goals: ['cost_reduction', 'esg_reporting', 'community_impact'],
    },
    {
      id: 'clean_water',
      name: 'Agua Limpia',
      relevance: 0,
      challenges: ['water_usage', 'high_costs', 'esg_compliance'],
      goals: ['cost_reduction', 'esg_reporting', 'innovation'],
    },
    {
      id: 'safe_cities',
      name: 'Ciudades Seguras',
      relevance: 0,
      challenges: ['community_relations'],
      goals: ['community_impact', 'brand_reputation'],
    },
    {
      id: 'zero_waste',
      name: 'Cero Residuos',
      relevance: 0,
      challenges: ['waste_management', 'high_costs', 'supply_chain'],
      goals: ['cost_reduction', 'innovation', 'esg_reporting'],
    },
    {
      id: 'fair_trade',
      name: 'Comercio Justo',
      relevance: 0,
      challenges: ['supply_chain', 'community_relations'],
      goals: ['community_impact', 'brand_reputation', 'innovation'],
    },
    {
      id: 'integration',
      name: 'Integración & Impacto',
      relevance: 0,
      challenges: ['esg_compliance'],
      goals: ['esg_reporting', 'community_impact', 'brand_reputation'],
    },
  ]

  // Calculate relevance score for each module
  allModules.forEach(module => {
    let score = 0
    
    // Add points for matching challenges
    formData.challenges.forEach((challenge: string) => {
      if (module.challenges.includes(challenge)) {
        score += 2
      }
    })
    
    // Add points for matching goals
    formData.goals.forEach((goal: string) => {
      if (module.goals.includes(goal)) {
        score += 3
      }
    })
    
    module.relevance = score
  })

  // Sort by relevance and return top modules
  const sortedModules = allModules.sort((a, b) => b.relevance - a.relevance)
  
  // Return recommended tier based on budget and goals
  let recommendedModules = []
  if (formData.budgetRange === '<50k' || formData.employeeCount === '10-30') {
    // Starter Bundle: Top 3 modules
    recommendedModules = sortedModules.slice(0, 3)
  } else if (formData.budgetRange === '500k+' || formData.goals.length >= 5) {
    // Enterprise Bundle: All 6 modules
    recommendedModules = sortedModules
  } else {
    // Impact Bundle: Top 5 modules + integration
    recommendedModules = sortedModules.slice(0, 5)
    if (!recommendedModules.find(m => m.id === 'integration')) {
      recommendedModules.push(allModules.find(m => m.id === 'integration')!)
    }
  }

  return recommendedModules.map(m => m.id)
}

// Pricing calculator (New Modular Model)
function calculatePricing(formData: any, recommendedModules: string[]) {
  const employeeCount = parseInt(formData.employeeCount.split('-')[0]) || 50
  const moduleCount = recommendedModules.length
  
  let basePrice = 0
  let tier = ''
  let employeeLimit = 50
  
  // Calculate employee packs needed (each pack = 50 employees)
  const employeePacks = Math.ceil(employeeCount / 50)
  const employeeMultiplier = employeePacks > 1 ? (1 + (employeePacks - 1) * 0.44) : 1 // 18k base, +8k per additional pack
  
  // Determine tier based on module count and employee count
  if (moduleCount <= 3) {
    tier = 'starter'
    // Starter Bundle: 3 modules for $45,000 (50 employees)
    basePrice = 45000 * employeeMultiplier
    employeeLimit = employeePacks * 50
  } else if (moduleCount >= 6) {
    if (employeeCount > 100) {
      tier = 'enterprise'
      // Enterprise: Custom pricing starting at $150,000
      basePrice = 150000 + (employeePacks - 2) * 15000 // Scaling discount
      employeeLimit = 999 // Unlimited
    } else {
      tier = 'impact'
      // Impact Bundle: 6 modules for $85,000 (100 employees)
      basePrice = 85000
      if (employeeCount <= 50) {
        basePrice = 70000 // Slight discount for fewer employees
      }
      employeeLimit = 100
    }
  } else {
    // 4-5 modules - between starter and impact
    tier = 'impact'
    basePrice = 65000 * employeeMultiplier
    employeeLimit = employeePacks * 50
  }

  return {
    tier,
    basePrice: Math.round(basePrice),
    pricePerModule: Math.round(basePrice / moduleCount),
    pricePerEmployee: Math.round(basePrice / employeeCount),
    moduleCount,
    employeeLimit,
    savings: tier === 'starter' ? 9000 : tier === 'impact' ? 23000 : tier === 'enterprise' ? 50000 : 0,
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const formData = await req.json()

    // Calculate ROI
    const roi = calculateROI(formData)

    // Recommend modules
    const recommendedModules = recommendModules(formData)

    // Calculate pricing
    const pricing = calculatePricing(formData, recommendedModules)

    // Save assessment to database
    // Note: company_assessments table may not exist yet, so we'll store in a simpler way
    // For now, we'll just return the data without saving to DB
    // In production, you'd create the company_assessments table first
    
    const assessment = {
      id: crypto.randomUUID(), // Generate temporary ID
      industry: formData.industry,
      employee_count: parseInt(formData.employeeCount.split('-')[0]) || 50,
      current_challenges: formData.challenges,
      employee_priorities: formData.goals,
      custom_notes: formData.painPoints,
      recommended_modules: recommendedModules,
      recommended_program: pricing.tier,
      estimated_impact_potential: roi.totalSavings > 100000 ? 'high' : roi.totalSavings > 50000 ? 'medium' : 'low',
      community_location: formData.location,
      created_at: new Date().toISOString(),
    }

    // Try to save to database, but don't fail if table doesn't exist
    try {
      await supabaseAdmin
        .from('company_assessments')
        .insert({
          industry: formData.industry,
          employee_count: parseInt(formData.employeeCount.split('-')[0]) || 50,
          current_challenges: formData.challenges,
          employee_priorities: formData.goals,
          custom_notes: formData.painPoints,
          recommended_modules: recommendedModules,
          recommended_program: pricing.tier,
          estimated_impact_potential: roi.totalSavings > 100000 ? 'high' : roi.totalSavings > 50000 ? 'medium' : 'low',
          community_location: formData.location,
          completed: true,
        })
    } catch (dbError) {
      // Table might not exist yet, that's okay
      console.log('DB save skipped (table may not exist):', dbError)
    }

    // Send assessment quote email
    try {
      await sendAssessmentQuoteEmail(
        formData.email,
        formData.companyName,
        formData.fullName,
        roi,
        recommendedModules,
        pricing,
        assessment.id
      )
      console.log('Assessment quote email sent to:', formData.email)
    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Failed to send assessment email:', emailError)
    }

    // Return assessment ID and calculated data
    return NextResponse.json({
      success: true,
      assessment_id: assessment.id,
      roi,
      modules: recommendedModules,
      pricing,
      companyName: formData.companyName,
      contact: {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      }
    })

  } catch (error: any) {
    console.error('Assessment creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar evaluación' },
      { status: 500 }
    )
  }
}

