import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * GET /api/corporate/reports/impact
 * 
 * Generates comprehensive impact reports from user activity data
 * Query params:
 *   - moduleId: Filter by specific module
 *   - format: 'json' | 'csv' (default: 'json')
 * 
 * Corporate admins can view all team data
 * Individual users can view their own data
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to view impact reports')
    }

    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get('moduleId')
    const format = searchParams.get('format') || 'json'

    // Get user profile to check if corporate admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, corporate_role')
      .eq('id', user.id)
      .single()

    const isCorporateAdmin = profile?.corporate_role === 'admin' && profile?.corporate_account_id

    // ✅ FIXED: Use JOIN instead of separate queries
    // Build query based on user type
    let enrollmentsQuery = supabase
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        module_id,
        progress_percentage,
        completed,
        xp_earned,
        purchase_type,
        purchased_at,
        completion_date,
        marketplace_modules (
          title,
          description,
          core_value
        ),
        lesson_responses(
          *,
          module_lessons (
            title,
            lesson_order
          )
        )
      `)

    if (isCorporateAdmin) {
      // Corporate admin: get all team enrollments
      enrollmentsQuery = enrollmentsQuery.eq('corporate_account_id', profile.corporate_account_id)
    } else {
      // Individual user: get own enrollments
      enrollmentsQuery = enrollmentsQuery.eq('user_id', user.id)
    }

    if (moduleId) {
      enrollmentsQuery = enrollmentsQuery.eq('module_id', moduleId)
    }

    const { data: enrollments, error: enrollmentsError } = await enrollmentsQuery

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
      return ApiResponse.serverError('Failed to fetch enrollments', 'ENROLLMENTS_FETCH_ERROR')
    }

    // Extract lesson responses from joined data
    const lessonResponses = enrollments?.flatMap((e: any) => e.lesson_responses || []) || []

    // Aggregate impact metrics
    const impactMetrics = {
      overview: {
        totalUsers: isCorporateAdmin ? enrollments?.length || 0 : 1,
        modulesEnrolled: enrollments?.length || 0,
        modulesCompleted: enrollments?.filter(e => e.completed).length || 0,
        averageCompletion: enrollments?.length 
          ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
          : 0,
        totalXPEarned: enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0,
        totalTimeSpent: lessonResponses?.reduce((sum, r) => sum + (r.time_spent_minutes || 0), 0) || 0
      },
      
      environmentalImpact: {
        carbonFootprintCalculated: lessonResponses?.filter(r => r.carbon_data).length || 0,
        totalCarbonMeasured: lessonResponses
          ?.filter(r => r.carbon_data?.total)
          .reduce((sum, r) => sum + (r.carbon_data.total || 0), 0) || 0,
        equivalentTrees: lessonResponses
          ?.filter(r => r.carbon_data?.comparisons?.trees)
          .reduce((sum, r) => sum + (r.carbon_data.comparisons.trees || 0), 0) || 0,
        airQualityAssessments: lessonResponses?.filter(r => 
          r.responses?.airQualityAssessment
        ).length || 0
      },
      
      financialImpact: {
        costAnalysesCompleted: lessonResponses?.filter(r => r.cost_data).length || 0,
        totalAnnualSavingsIdentified: lessonResponses
          ?.filter(r => r.cost_data?.annualSavings)
          .reduce((sum, r) => sum + (r.cost_data.annualSavings || 0), 0) || 0,
        averageROI: lessonResponses?.filter(r => r.cost_data?.roi).length > 0
          ? Math.round(
              lessonResponses
                .filter(r => r.cost_data?.roi)
                .reduce((sum, r) => sum + (r.cost_data.roi || 0), 0) / 
              lessonResponses.filter(r => r.cost_data?.roi).length
            )
          : 0,
        averagePaybackMonths: lessonResponses?.filter(r => r.cost_data?.paybackMonths).length > 0
          ? Math.round(
              lessonResponses
                .filter(r => r.cost_data?.paybackMonths)
                .reduce((sum, r) => sum + (r.cost_data.paybackMonths || 0), 0) / 
              lessonResponses.filter(r => r.cost_data?.paybackMonths).length * 10
            ) / 10
          : 0
      },
      
      engagementMetrics: {
        totalLessonsCompleted: lessonResponses?.length || 0,
        reflectionsSubmitted: lessonResponses?.filter(r => r.reflection).length || 0,
        actionItemsCommitted: lessonResponses
          ?.filter(r => r.action_items?.length > 0)
          .reduce((sum, r) => sum + (r.action_items?.length || 0), 0) || 0,
        evidenceUploaded: lessonResponses?.filter(r => 
          r.evidence_urls && r.evidence_urls.length > 0
        ).length || 0,
        averageTimePerLesson: lessonResponses?.length > 0
          ? Math.round(
              lessonResponses.reduce((sum, r) => sum + (r.time_spent_minutes || 0), 0) / 
              lessonResponses.length
            )
          : 0
      }
    }

    // Collect action items across all responses
    const actionItems = lessonResponses
      ?.filter(r => r.action_items && r.action_items.length > 0)
      .flatMap(r => r.action_items.map((item: string) => ({
        action: item,
        module: r.module_lessons?.title || 'Unknown',
        userId: r.enrollment_id
      }))) || []

    // Collect key learnings from reflections
    const reflections = lessonResponses
      ?.filter(r => r.reflection)
      .map(r => ({
        reflection: r.reflection,
        lesson: r.module_lessons?.title || 'Unknown',
        completedAt: r.completed_at
      })) || []

    const report = {
      generatedAt: new Date().toISOString(),
      generatedFor: isCorporateAdmin ? 'team' : 'individual',
      filters: {
        moduleId: moduleId || 'all'
      },
      metrics: impactMetrics,
      actionItems,
      reflections: reflections.slice(0, 20), // Limit for JSON response
      rawData: {
        enrollments,
        lessonResponses
      }
    }

    // Return as JSON or CSV
    if (format === 'csv') {
      return generateCSVReport(report)
    }

    return NextResponse.json(report)

  } catch (error: any) {
    console.error('Error generating impact report:', error)
    return ApiResponse.serverError('Failed to generate impact report', 'IMPACT_REPORT_ERROR', { message: error.message })
  }
}

/**
 * Generate CSV format for download
 */
function generateCSVReport(report: any) {
  const { metrics } = report
  
  let csv = 'Crowd Conscious - Impact Report\n'
  csv += `Generated: ${new Date().toISOString()}\n\n`
  
  csv += 'OVERVIEW METRICS\n'
  csv += `Total Users,${metrics.overview.totalUsers}\n`
  csv += `Modules Enrolled,${metrics.overview.modulesEnrolled}\n`
  csv += `Modules Completed,${metrics.overview.modulesCompleted}\n`
  csv += `Average Completion,${metrics.overview.averageCompletion}%\n`
  csv += `Total XP Earned,${metrics.overview.totalXPEarned}\n`
  csv += `Total Time Spent (hours),${Math.round(metrics.overview.totalTimeSpent / 60)}\n\n`
  
  csv += 'ENVIRONMENTAL IMPACT\n'
  csv += `Carbon Assessments,${metrics.environmentalImpact.carbonFootprintCalculated}\n`
  csv += `Total Carbon Measured (kg CO2),${metrics.environmentalImpact.totalCarbonMeasured}\n`
  csv += `Equivalent Trees Needed,${metrics.environmentalImpact.equivalentTrees}\n`
  csv += `Air Quality Assessments,${metrics.environmentalImpact.airQualityAssessments}\n\n`
  
  csv += 'FINANCIAL IMPACT\n'
  csv += `Cost Analyses Completed,${metrics.financialImpact.costAnalysesCompleted}\n`
  csv += `Total Annual Savings Identified (MXN),${metrics.financialImpact.totalAnnualSavingsIdentified.toLocaleString()}\n`
  csv += `Average ROI,%${metrics.financialImpact.averageROI}\n`
  csv += `Average Payback (months),${metrics.financialImpact.averagePaybackMonths}\n\n`
  
  csv += 'ENGAGEMENT METRICS\n'
  csv += `Total Lessons Completed,${metrics.engagementMetrics.totalLessonsCompleted}\n`
  csv += `Reflections Submitted,${metrics.engagementMetrics.reflectionsSubmitted}\n`
  csv += `Action Items Committed,${metrics.engagementMetrics.actionItemsCommitted}\n`
  csv += `Evidence Uploaded,${metrics.engagementMetrics.evidenceUploaded}\n`
  csv += `Average Time Per Lesson (min),${metrics.engagementMetrics.averageTimePerLesson}\n\n`
  
  csv += 'ACTION ITEMS\n'
  csv += 'Action,Module\n'
  report.actionItems.forEach((item: any) => {
    csv += `"${item.action}","${item.module}"\n`
  })

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="impact-report-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

