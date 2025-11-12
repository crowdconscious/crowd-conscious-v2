import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

/**
 * Generate Professional ESG Report PDF
 * 
 * Design matches certificate quality with:
 * - Crowd Conscious branding (white logo text, top-left)
 * - Gradient headers
 * - Visual impact indicators
 * - Professional layout
 * - Certificate-like footer
 */
export async function generateProfessionalESGPDF(reportData: any): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // =========================================
  // HEADER: Professional Gradient Banner
  // =========================================
  
  // Gradient background (teal to purple - matching platform colors)
  const gradientSteps = 50
  for (let i = 0; i < gradientSteps; i++) {
    const progress = i / gradientSteps
    // Interpolate from teal (20,184,166) to purple (147,51,234)
    const r = Math.round(20 + (147 - 20) * progress)
    const g = Math.round(184 + (51 - 184) * progress)
    const b = Math.round(166 + (234 - 166) * progress)
    
    doc.setFillColor(r, g, b)
    doc.rect(0, 0, pageWidth, 45, 'F')
  }

  // Logo text - white, top-left corner, above tagline
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('CROWDCONSCIOUS', 20, 15)

  // Tagline - positioned below logo
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.text('Impulsando el cambio a través de la educación', 20, 21)

  // Report Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('REPORTE ESG', 20, 37)
  
  // Report Type Badge
  const reportTypeText = reportData.report_type === 'individual' 
    ? 'Individual' 
    : reportData.report_type === 'corporate' 
    ? 'Corporativo' 
    : 'Módulo'
  
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageWidth - 50, 30, 40, 10, 2, 2, 'F')
  doc.setTextColor(147, 51, 234)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(reportTypeText, pageWidth - 30, 36, { align: 'center' })

  // =========================================
  // META INFO: Date & Verification
  // =========================================
  
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}`, pageWidth - 20, 52, { align: 'right' })
  doc.text(`ID de Verificación: ESG-${Date.now().toString(36).toUpperCase()}`, pageWidth - 20, 57, { align: 'right' })

  let yPosition = 70

  // =========================================
  // MAIN CONTENT SECTION
  // =========================================
  
  if (reportData.report_type === 'individual') {
    // Individual Report
    yPosition = addIndividualReportContent(doc, reportData, yPosition, pageWidth)
  } else if (reportData.report_type === 'corporate') {
    // Corporate Report
    yPosition = addCorporateReportContent(doc, reportData, yPosition, pageWidth)
  }

  // =========================================
  // FOOTER: Certificate-style
  // =========================================
  
  // Decorative line
  doc.setDrawColor(20, 184, 166)
  doc.setLineWidth(0.5)
  doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30)

  // Signature section
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Este reporte ha sido generado automáticamente por la plataforma Crowd Conscious', pageWidth / 2, pageHeight - 24, { align: 'center' })
  doc.text('y certifica el impacto ambiental y social documentado durante el período de capacitación.', pageWidth / 2, pageHeight - 20, { align: 'center' })

  // Platform info
  doc.setFontSize(9)
  doc.setTextColor(20, 184, 166)
  doc.setFont('helvetica', 'bold')
  doc.text('crowdconscious.app', pageWidth / 2, pageHeight - 13, { align: 'center' })
  
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'normal')
  doc.text('Transformando empresas y comunidades a través del aprendizaje de impacto', pageWidth / 2, pageHeight - 9, { align: 'center' })

  // Return PDF as buffer
  const pdfBuffer = doc.output('arraybuffer')
  return Buffer.from(pdfBuffer)
}

/**
 * Add Individual Report Content
 */
function addIndividualReportContent(doc: jsPDF, reportData: any, startY: number, pageWidth: number): number {
  let y = startY

  // Module Info Box
  doc.setFillColor(240, 248, 255) // Light blue background
  doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, 'F')
  
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Módulo Completado', 25, y + 8)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(reportData.module?.title || 'No especificado', 25, y + 16)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Core Value: ${getCoreValueLabel(reportData.module?.core_value)}`, 25, y + 22)
  
  // Progress indicators
  const progress = reportData.progress?.completion_percentage || 0
  const xpEarned = reportData.progress?.xp_earned || 0
  const timeSpent = reportData.progress?.time_spent_minutes || 0
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(20, 184, 166)
  doc.text(`${progress}% Completado`, 25, y + 30)
  doc.text(`${xpEarned} XP`, 70, y + 30)
  doc.text(`${Math.round(timeSpent / 60 * 10) / 10}h`, 100, y + 30)
  
  y += 45

  // Impact Section
  y = addImpactSection(doc, reportData, y, pageWidth)

  // Tools Used Section
  if (reportData.tools?.results && reportData.tools.results.length > 0) {
    y = addToolsSection(doc, reportData, y, pageWidth)
  }

  return y
}

/**
 * Add Corporate Report Content
 */
function addCorporateReportContent(doc: jsPDF, reportData: any, startY: number, pageWidth: number): number {
  let y = startY

  // Company Info Box
  doc.setFillColor(255, 248, 240) // Light orange background
  doc.roundedRect(20, y, pageWidth - 40, 40, 3, 3, 'F')
  
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Información Corporativa', 25, y + 8)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Empresa: ${reportData.company?.name || 'No especificado'}`, 25, y + 16)
  doc.text(`Industria: ${reportData.company?.industry || 'No especificado'}`, 25, y + 22)
  doc.text(`Empleados: ${reportData.company?.employee_count || 0}`, 25, y + 28)
  
  // Participation stats
  const participationRate = reportData.participation?.participation_rate || 0
  const enrolled = reportData.participation?.enrolled || 0
  const completedModules = reportData.learning?.completed_modules || 0
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(147, 51, 234)
  doc.text(`${participationRate}% Participación`, 25, y + 36)
  doc.text(`${enrolled} Inscritos`, 70, y + 36)
  doc.text(`${completedModules} Completados`, 120, y + 36)
  
  y += 50

  // Impact Section
  y = addImpactSection(doc, reportData, y, pageWidth)

  return y
}

/**
 * Add Impact Section (shared by individual and corporate)
 */
function addImpactSection(doc: jsPDF, reportData: any, startY: number, pageWidth: number): number {
  let y = startY

  // Section Title
  doc.setFontSize(14)
  doc.setTextColor(76, 175, 80) // Green
  doc.setFont('helvetica', 'bold')
  doc.text('Impacto Ambiental Documentado', 20, y)
  
  y += 10

  const impact = reportData.impact || {}
  
  // Impact Cards (2x2 grid)
  const cardWidth = (pageWidth - 50) / 2
  const cardHeight = 25
  const gap = 10

  // Card 1: CO2 (Unicode removed for PDF compatibility)
  drawImpactCard(doc, 20, y, cardWidth, cardHeight, {
    icon: '',
    label: 'CO2 Reducido',
    value: `${impact.co2_reduced_kg || 0} kg`,
    subtitle: `~${impact.trees_equivalent || 0} arboles`,
    color: [76, 175, 80] // Green
  })

  // Card 2: Water
  drawImpactCard(doc, 20 + cardWidth + gap, y, cardWidth, cardHeight, {
    icon: '',
    label: 'Agua Ahorrada',
    value: `${(impact.water_saved_liters || 0).toLocaleString('es-MX')} L`,
    subtitle: 'Litros conservados',
    color: [33, 150, 243] // Blue
  })

  y += cardHeight + gap

  // Card 3: Waste
  drawImpactCard(doc, 20, y, cardWidth, cardHeight, {
    icon: '',
    label: 'Residuos Reducidos',
    value: `${impact.waste_reduced_kg || 0} kg`,
    subtitle: 'Basura evitada',
    color: [255, 152, 0] // Orange
  })

  // Card 4: Savings
  drawImpactCard(doc, 20 + cardWidth + gap, y, cardWidth, cardHeight, {
    icon: '',
    label: 'Ahorro en Costos',
    value: `$${(impact.cost_savings_mxn || 0).toLocaleString('es-MX')}`,
    subtitle: 'MXN ahorrados/año',
    color: [156, 39, 176] // Purple
  })

  y += cardHeight + 15

  return y
}

/**
 * Draw Impact Card
 */
function drawImpactCard(doc: jsPDF, x: number, y: number, width: number, height: number, data: any) {
  // Card background with gradient effect (simulated with multiple rectangles)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(x, y, width, height, 2, 2, 'F')
  
  // Colored accent bar on left
  doc.setFillColor(data.color[0], data.color[1], data.color[2])
  doc.roundedRect(x, y, 3, height, 1, 1, 'F')
  
  // Icon (using emoji as text)
  doc.setFontSize(16)
  doc.text(data.icon, x + 8, y + 10)
  
  // Label
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.text(data.label, x + 20, y + 8)
  
  // Value (big and bold)
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(data.value, x + 20, y + 16)
  
  // Subtitle
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(data.subtitle, x + 20, y + 21)
}

/**
 * Add Tools Section
 */
function addToolsSection(doc: jsPDF, reportData: any, startY: number, pageWidth: number): number {
  let y = startY

  // Section Title
  doc.setFontSize(12)
  doc.setTextColor(33, 150, 243) // Blue
  doc.setFont('helvetica', 'bold')
  doc.text('Herramientas Utilizadas', 20, y)
  
  y += 8

  // Tools list
  const tools = reportData.tools.results.slice(0, 10) // Limit to 10 for space
  
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  tools.forEach((tool: any, index: number) => {
    if (y > 250) return // Stop if running out of space
    
    const toolName = formatToolName(tool.tool_name)
    const toolType = tool.tool_type || 'calculadora'
    
    doc.setFont('helvetica', 'bold')
    doc.text(`• ${toolName}`, 25, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`(${toolType})`, 110, y)
    
    y += 5
  })

  if (reportData.tools.results.length > 10) {
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`... y ${reportData.tools.results.length - 10} herramientas más`, 25, y)
    y += 5
  }

  return y + 10
}

/**
 * Helper: Get Core Value Label
 */
function getCoreValueLabel(coreValue: string): string {
  const labels: any = {
    'clean_air': 'Aire Limpio',
    'clean_water': 'Agua Limpia',
    'safe_cities': 'Ciudades Seguras',
    'zero_waste': 'Cero Residuos',
    'fair_trade': 'Comercio Justo',
    'impact_integration': 'Integración de Impacto'
  }
  return labels[coreValue] || coreValue
}

/**
 * Helper: Format Tool Name
 */
function formatToolName(toolName: string): string {
  return toolName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace('Air Quality', 'Calidad del Aire')
    .replace('Water Footprint', 'Huella Hídrica')
    .replace('Carbon', 'Carbono')
    .replace('Calculator', 'Calculadora')
    .replace('Assessment', 'Evaluación')
    .replace('Roi', 'ROI')
}

