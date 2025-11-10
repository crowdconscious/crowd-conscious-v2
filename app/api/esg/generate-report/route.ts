import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export const dynamic = 'force-dynamic'

/**
 * Generate ESG Reports in PDF or Excel format
 * 
 * Query Parameters:
 * - format: 'pdf' | 'excel' | 'json' (default: 'json')
 * - type: 'individual' | 'module' | 'corporate' (default: 'individual')
 * - enrollment_id: For individual reports
 * - module_id: For module-specific reports
 * - corporate_account_id: For corporate reports
 * - date_from: Start date (optional)
 * - date_to: End date (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // pdf, excel, json
    const type = searchParams.get('type') || 'individual'
    const enrollment_id = searchParams.get('enrollment_id')
    const module_id = searchParams.get('module_id')
    const corporate_account_id = searchParams.get('corporate_account_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    console.log('📊 Generating ESG report:', { format, type, user_id: user.id })

    // Build the report data based on type
    let reportData: any

    if (type === 'individual' && enrollment_id) {
      reportData = await generateIndividualReport(supabase, user.id, enrollment_id, date_from, date_to)
    } else if (type === 'module' && module_id) {
      reportData = await generateModuleReport(supabase, user.id, module_id, date_from, date_to)
    } else if (type === 'corporate' && corporate_account_id) {
      reportData = await generateCorporateReport(supabase, corporate_account_id, date_from, date_to)
    } else {
      return NextResponse.json({ 
        error: 'Parámetros inválidos. Se requiere enrollment_id, module_id o corporate_account_id según el tipo.' 
      }, { status: 400 })
    }

    if (!reportData || reportData.error) {
      return NextResponse.json({ 
        error: reportData?.error || 'No se encontraron datos para el reporte' 
      }, { status: 404 })
    }

    // Return format based on request
    if (format === 'json') {
      return NextResponse.json(reportData)
    } else if (format === 'excel') {
      const excelBuffer = await generateExcelReport(reportData)
      // Convert Buffer to Uint8Array for NextResponse compatibility
      return new NextResponse(new Uint8Array(excelBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="esg-report-${Date.now()}.xlsx"`
        }
      })
    } else if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(reportData)
      // Convert Buffer to Uint8Array for NextResponse compatibility
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="esg-report-${Date.now()}.pdf"`
        }
      })
    } else {
      return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Error generating ESG report:', error)
    return NextResponse.json({ 
      error: 'Error generando reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

/**
 * Generate Individual Learning Report
 * Shows one user's progress through a specific module
 */
async function generateIndividualReport(
  supabase: any,
  user_id: string,
  enrollment_id: string,
  date_from?: string | null,
  date_to?: string | null
) {
  // Get enrollment details
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      marketplace_modules (
        id,
        title,
        description,
        core_value,
        estimated_duration_hours,
        xp_reward
      )
    `)
    .eq('id', enrollment_id)
    .eq('user_id', user_id)
    .single()

  if (!enrollment) {
    return { error: 'Inscripción no encontrada' }
  }

  // Get all activity responses for this enrollment
  let query = supabase
    .from('activity_responses')
    .select('*')
    .eq('enrollment_id', enrollment_id)
    .order('created_at', { ascending: true })

  if (date_from) query = query.gte('created_at', date_from)
  if (date_to) query = query.lte('created_at', date_to)

  const { data: activities } = await query

  // Extract tool data from custom_responses
  const toolResults: Array<{
    tool_name: string
    tool_type: string
    data: any
    saved_at: string
    lesson_id: string
  }> = []
  if (activities) {
    for (const activity of activities) {
      if (activity.custom_responses) {
        Object.entries(activity.custom_responses).forEach(([key, value]: [string, any]) => {
          if (key.startsWith('tool_')) {
            toolResults.push({
              tool_name: key.replace('tool_', ''),
              tool_type: value.tool_type,
              data: value,
              saved_at: value.saved_at,
              lesson_id: activity.lesson_id
            })
          }
        })
      }
    }
  }

  // Calculate impact metrics from tool data
  const impactMetrics = calculateImpactMetrics(toolResults)

  return {
    report_type: 'individual',
    generated_at: new Date().toISOString(),
    user: {
      id: user_id,
      enrollment_id: enrollment_id
    },
    module: {
      id: enrollment.marketplace_modules?.id,
      title: enrollment.marketplace_modules?.title,
      core_value: enrollment.marketplace_modules?.core_value,
      duration: enrollment.marketplace_modules?.estimated_duration_hours
    },
    progress: {
      status: enrollment.status,
      completion_percentage: enrollment.progress_percentage || enrollment.completion_percentage || 0,
      xp_earned: enrollment.xp_earned || 0,
      completed: enrollment.completed,
      completed_at: enrollment.completed_at,
      started_at: enrollment.started_at,
      time_spent_minutes: enrollment.total_time_spent || 0
    },
    activities: {
      total_count: activities?.length || 0,
      responses: activities || []
    },
    tools: {
      total_used: toolResults.length,
      results: toolResults
    },
    impact: impactMetrics,
    date_range: {
      from: date_from || enrollment.created_at,
      to: date_to || new Date().toISOString()
    }
  }
}

/**
 * Generate Module Impact Report
 * Shows aggregate impact across all users in a module
 */
async function generateModuleReport(
  supabase: any,
  user_id: string,
  module_id: string,
  date_from?: string | null,
  date_to?: string | null
) {
  // Get module details
  const { data: module } = await supabase
    .from('marketplace_modules')
    .select('*')
    .eq('id', module_id)
    .single()

  if (!module) {
    return { error: 'Módulo no encontrado' }
  }

  // Get all enrollments for this module
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('module_id', module_id)

  // Get all activity responses for these enrollments
  const enrollmentIds = enrollments?.map(e => e.id) || []
  
  let query = supabase
    .from('activity_responses')
    .select('*')
    .in('enrollment_id', enrollmentIds)

  if (date_from) query = query.gte('created_at', date_from)
  if (date_to) query = query.lte('created_at', date_to)

  const { data: activities } = await query

  // Aggregate tool results
  const allToolResults: Array<{
    tool_name: string
    data: any
    user_id: string
  }> = []
  if (activities) {
    for (const activity of activities) {
      if (activity.custom_responses) {
        Object.entries(activity.custom_responses).forEach(([key, value]: [string, any]) => {
          if (key.startsWith('tool_')) {
            allToolResults.push({
              tool_name: key.replace('tool_', ''),
              data: value,
              user_id: activity.user_id
            })
          }
        })
      }
    }
  }

  // Calculate aggregate impact
  const aggregateImpact = calculateAggregateImpact(allToolResults)

  return {
    report_type: 'module',
    generated_at: new Date().toISOString(),
    module: {
      id: module.id,
      title: module.title,
      description: module.description,
      core_value: module.core_value
    },
    participation: {
      total_enrollments: enrollments?.length || 0,
      completed: enrollments?.filter(e => e.completed).length || 0,
      in_progress: enrollments?.filter(e => e.status === 'in_progress').length || 0,
      completion_rate: enrollments?.length ? 
        ((enrollments.filter(e => e.completed).length / enrollments.length) * 100).toFixed(1) : 0
    },
    tools: {
      total_uses: allToolResults.length,
      unique_tools: [...new Set(allToolResults.map(t => t.tool_name))].length,
      results: allToolResults
    },
    impact: aggregateImpact,
    date_range: {
      from: date_from || module.created_at,
      to: date_to || new Date().toISOString()
    }
  }
}

/**
 * Generate Corporate ESG Compliance Report
 * Shows company-wide metrics across all modules and employees
 */
async function generateCorporateReport(
  supabase: any,
  corporate_account_id: string,
  date_from?: string | null,
  date_to?: string | null
) {
  // Get corporate account details
  const { data: corporate } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', corporate_account_id)
    .single()

  if (!corporate) {
    return { error: 'Cuenta corporativa no encontrada' }
  }

  // Get all employees
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, corporate_role')
    .eq('corporate_account_id', corporate_account_id)

  // Get all enrollments for this company
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      marketplace_modules (id, title, core_value)
    `)
    .eq('corporate_account_id', corporate_account_id)

  // Get all activity responses
  const enrollmentIds = enrollments?.map(e => e.id) || []
  
  let query = supabase
    .from('activity_responses')
    .select('*')
    .in('enrollment_id', enrollmentIds)

  if (date_from) query = query.gte('created_at', date_from)
  if (date_to) query = query.lte('created_at', date_to)

  const { data: activities } = await query

  // Calculate company-wide metrics
  const totalXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
  const completedModules = enrollments?.filter(e => e.completed).length || 0
  const uniqueModules = [...new Set(enrollments?.map(e => e.module_id))].length || 0

  // Extract all tool results for company-wide impact
  const companyToolResults: Array<{
    tool_name: string
    data: any
  }> = []
  if (activities) {
    for (const activity of activities) {
      if (activity.custom_responses) {
        Object.entries(activity.custom_responses).forEach(([key, value]: [string, any]) => {
          if (key.startsWith('tool_')) {
            companyToolResults.push({
              tool_name: key.replace('tool_', ''),
              data: value
            })
          }
        })
      }
    }
  }

  const companyImpact = calculateCompanyWideImpact(companyToolResults)

  return {
    report_type: 'corporate',
    generated_at: new Date().toISOString(),
    company: {
      id: corporate.id,
      name: corporate.company_name,
      industry: corporate.industry,
      employee_count: employees?.length || 0
    },
    participation: {
      total_employees: employees?.length || 0,
      enrolled: [...new Set(enrollments?.map(e => e.user_id))].length || 0,
      participation_rate: employees?.length ? 
        (([...new Set(enrollments?.map(e => e.user_id))].length / employees.length) * 100).toFixed(1) : 0
    },
    learning: {
      total_enrollments: enrollments?.length || 0,
      unique_modules: uniqueModules,
      completed_modules: completedModules,
      total_xp: totalXP,
      avg_completion_rate: enrollments?.length ?
        ((completedModules / enrollments.length) * 100).toFixed(1) : 0
    },
    tools: {
      total_uses: companyToolResults.length,
      unique_tools: [...new Set(companyToolResults.map(t => t.tool_name))].length
    },
    impact: companyImpact,
    by_core_value: groupImpactByCoreValue(enrollments, activities),
    date_range: {
      from: date_from || corporate.created_at,
      to: date_to || new Date().toISOString()
    }
  }
}

/**
 * Calculate impact metrics from tool results
 */
function calculateImpactMetrics(toolResults: any[]) {
  const metrics: any = {
    co2_reduced_kg: 0,
    water_saved_liters: 0,
    waste_reduced_kg: 0,
    cost_savings_mxn: 0,
    energy_saved_kwh: 0,
    trees_equivalent: 0,
    details: []
  }

  for (const tool of toolResults) {
    // Air Quality tools
    if (tool.tool_name === 'air-quality-roi' && tool.data.annualSavings) {
      metrics.cost_savings_mxn += tool.data.annualSavings || 0
      metrics.co2_reduced_kg += 500 // Estimated CO2 reduction from air quality improvements
    }
    
    // Water tools
    if (tool.tool_name === 'water-footprint-calculator' && tool.data.totalWater) {
      metrics.water_saved_liters += tool.data.totalWater * 0.2 // Assume 20% reduction
    }
    
    // Waste tools
    if (tool.tool_name === 'waste-stream-analyzer' && tool.data.totalWaste) {
      metrics.waste_reduced_kg += tool.data.totalWaste * 0.3 // Assume 30% reduction
    }
    
    // ROI calculators
    if (tool.tool_type === 'calculator' && tool.data.annualSavings) {
      metrics.cost_savings_mxn += tool.data.annualSavings || 0
    }
  }

  // Calculate trees equivalent (1 tree absorbs ~21 kg CO2/year)
  metrics.trees_equivalent = Math.round(metrics.co2_reduced_kg / 21)

  return metrics
}

/**
 * Calculate aggregate impact across multiple users
 */
function calculateAggregateImpact(toolResults: any[]) {
  // Group by user and sum up
  const userImpacts = new Map()
  
  for (const tool of toolResults) {
    if (!userImpacts.has(tool.user_id)) {
      userImpacts.set(tool.user_id, {
        co2_reduced_kg: 0,
        water_saved_liters: 0,
        waste_reduced_kg: 0,
        cost_savings_mxn: 0
      })
    }
    
    const impact = userImpacts.get(tool.user_id)
    
    // Similar calculation as individual
    if (tool.tool_name === 'air-quality-roi') {
      impact.cost_savings_mxn += tool.data.annualSavings || 0
      impact.co2_reduced_kg += 500
    }
    if (tool.tool_name === 'water-footprint-calculator') {
      impact.water_saved_liters += (tool.data.totalWater || 0) * 0.2
    }
    if (tool.tool_name === 'waste-stream-analyzer') {
      impact.waste_reduced_kg += (tool.data.totalWaste || 0) * 0.3
    }
  }

  // Sum all user impacts
  const total = {
    co2_reduced_kg: 0,
    water_saved_liters: 0,
    waste_reduced_kg: 0,
    cost_savings_mxn: 0,
    participating_users: userImpacts.size
  }

  for (const impact of userImpacts.values()) {
    total.co2_reduced_kg += impact.co2_reduced_kg
    total.water_saved_liters += impact.water_saved_liters
    total.waste_reduced_kg += impact.waste_reduced_kg
    total.cost_savings_mxn += impact.cost_savings_mxn
  }

  total.co2_reduced_kg = Math.round(total.co2_reduced_kg)
  total.water_saved_liters = Math.round(total.water_saved_liters)
  total.waste_reduced_kg = Math.round(total.waste_reduced_kg)
  total.cost_savings_mxn = Math.round(total.cost_savings_mxn)

  return total
}

/**
 * Calculate company-wide impact
 */
function calculateCompanyWideImpact(toolResults: any[]) {
  return calculateAggregateImpact(toolResults.map(t => ({ ...t, user_id: t.tool_name })))
}

/**
 * Group impact by core value (clean_air, clean_water, etc.)
 */
function groupImpactByCoreValue(enrollments: any[], activities: any[]) {
  const byValue: any = {}
  
  if (!enrollments) return byValue

  for (const enrollment of enrollments) {
    const coreValue = enrollment.marketplace_modules?.core_value
    if (!coreValue) continue
    
    if (!byValue[coreValue]) {
      byValue[coreValue] = {
        enrollments: 0,
        completed: 0,
        xp_earned: 0
      }
    }
    
    byValue[coreValue].enrollments++
    if (enrollment.completed) byValue[coreValue].completed++
    byValue[coreValue].xp_earned += enrollment.xp_earned || 0
  }

  return byValue
}

/**
 * Generate Excel Report
 */
async function generateExcelReport(reportData: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  
  // Metadata
  workbook.creator = 'Crowd Conscious'
  workbook.created = new Date()
  workbook.modified = new Date()
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Resumen')
  
  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 20 }
  ]
  
  // Add header styling
  summarySheet.getRow(1).font = { bold: true, size: 12 }
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4CAF50' }
  }
  
  // Add data based on report type
  if (reportData.report_type === 'individual') {
    summarySheet.addRows([
      { metric: 'Tipo de Reporte', value: 'Individual' },
      { metric: 'Módulo', value: reportData.module?.title },
      { metric: 'Completado', value: reportData.progress?.completion_percentage + '%' },
      { metric: 'XP Ganado', value: reportData.progress?.xp_earned },
      { metric: 'Tiempo Invertido (min)', value: reportData.progress?.time_spent_minutes },
      { metric: '', value: '' },
      { metric: 'IMPACTO AMBIENTAL', value: '' },
      { metric: 'CO₂ Reducido (kg)', value: reportData.impact?.co2_reduced_kg },
      { metric: 'Agua Ahorrada (L)', value: reportData.impact?.water_saved_liters },
      { metric: 'Residuos Reducidos (kg)', value: reportData.impact?.waste_reduced_kg },
      { metric: 'Ahorro en Costos (MXN)', value: reportData.impact?.cost_savings_mxn },
      { metric: 'Equivalente en Árboles', value: reportData.impact?.trees_equivalent }
    ])
  } else if (reportData.report_type === 'corporate') {
    summarySheet.addRows([
      { metric: 'Tipo de Reporte', value: 'Corporativo' },
      { metric: 'Empresa', value: reportData.company?.name },
      { metric: 'Industria', value: reportData.company?.industry },
      { metric: 'Total Empleados', value: reportData.company?.employee_count },
      { metric: 'Empleados Inscritos', value: reportData.participation?.enrolled },
      { metric: 'Tasa de Participación', value: reportData.participation?.participation_rate + '%' },
      { metric: 'Módulos Completados', value: reportData.learning?.completed_modules },
      { metric: 'XP Total', value: reportData.learning?.total_xp },
      { metric: '', value: '' },
      { metric: 'IMPACTO COMPAÑÍA', value: '' },
      { metric: 'CO₂ Reducido (kg)', value: reportData.impact?.co2_reduced_kg },
      { metric: 'Agua Ahorrada (L)', value: reportData.impact?.water_saved_liters },
      { metric: 'Residuos Reducidos (kg)', value: reportData.impact?.waste_reduced_kg },
      { metric: 'Ahorro Total (MXN)', value: reportData.impact?.cost_savings_mxn }
    ])
  }
  
  // Tools Sheet
  if (reportData.tools?.results && reportData.tools.results.length > 0) {
    const toolsSheet = workbook.addWorksheet('Herramientas Utilizadas')
    
    toolsSheet.columns = [
      { header: 'Herramienta', key: 'tool', width: 30 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Fecha', key: 'date', width: 20 }
    ]
    
    toolsSheet.getRow(1).font = { bold: true }
    toolsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2196F3' }
    }
    
    for (const tool of reportData.tools.results) {
      toolsSheet.addRow({
        tool: tool.tool_name,
        type: tool.tool_type,
        date: new Date(tool.saved_at || tool.data.saved_at).toLocaleString('es-MX')
      })
    }
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Generate PDF Report
 */
async function generatePDFReport(reportData: any): Promise<Buffer> {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(76, 175, 80) // Green
  doc.text('Reporte ESG - Crowd Conscious', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 105, 28, { align: 'center' })
  
  // Content based on report type
  let yPosition = 40
  
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  
  if (reportData.report_type === 'individual') {
    // Individual Report
    doc.text('Reporte Individual de Aprendizaje', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(11)
    doc.text(`Módulo: ${reportData.module?.title}`, 20, yPosition)
    yPosition += 7
    doc.text(`Progreso: ${reportData.progress?.completion_percentage}%`, 20, yPosition)
    yPosition += 7
    doc.text(`XP Ganado: ${reportData.progress?.xp_earned}`, 20, yPosition)
    yPosition += 7
    doc.text(`Tiempo Invertido: ${reportData.progress?.time_spent_minutes} minutos`, 20, yPosition)
    yPosition += 12
    
    // Impact Section
    doc.setFontSize(14)
    doc.setTextColor(76, 175, 80)
    doc.text('Impacto Ambiental', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`CO₂ Reducido: ${reportData.impact?.co2_reduced_kg} kg`, 20, yPosition)
    yPosition += 7
    doc.text(`Agua Ahorrada: ${reportData.impact?.water_saved_liters} litros`, 20, yPosition)
    yPosition += 7
    doc.text(`Residuos Reducidos: ${reportData.impact?.waste_reduced_kg} kg`, 20, yPosition)
    yPosition += 7
    doc.text(`Ahorro en Costos: $${reportData.impact?.cost_savings_mxn.toLocaleString('es-MX')} MXN`, 20, yPosition)
    yPosition += 7
    doc.text(`Equivalente a ${reportData.impact?.trees_equivalent} árboles plantados`, 20, yPosition)
    
  } else if (reportData.report_type === 'corporate') {
    // Corporate Report
    doc.text('Reporte Corporativo ESG', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(11)
    doc.text(`Empresa: ${reportData.company?.name}`, 20, yPosition)
    yPosition += 7
    doc.text(`Industria: ${reportData.company?.industry}`, 20, yPosition)
    yPosition += 7
    doc.text(`Empleados: ${reportData.company?.employee_count}`, 20, yPosition)
    yPosition += 7
    doc.text(`Participación: ${reportData.participation?.participation_rate}%`, 20, yPosition)
    yPosition += 7
    doc.text(`Módulos Completados: ${reportData.learning?.completed_modules}`, 20, yPosition)
    yPosition += 12
    
    // Impact Section
    doc.setFontSize(14)
    doc.setTextColor(76, 175, 80)
    doc.text('Impacto Corporativo', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`CO₂ Reducido: ${reportData.impact?.co2_reduced_kg} kg`, 20, yPosition)
    yPosition += 7
    doc.text(`Agua Ahorrada: ${reportData.impact?.water_saved_liters} litros`, 20, yPosition)
    yPosition += 7
    doc.text(`Residuos Reducidos: ${reportData.impact?.waste_reduced_kg} kg`, 20, yPosition)
    yPosition += 7
    doc.text(`Ahorro Total: $${reportData.impact?.cost_savings_mxn.toLocaleString('es-MX')} MXN`, 20, yPosition)
  }
  
  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('crowdconscious.app | Impulsando el cambio a través de la educación', 105, 280, { align: 'center' })
  
  // Return PDF as buffer
  const pdfBuffer = doc.output('arraybuffer')
  return Buffer.from(pdfBuffer)
}

