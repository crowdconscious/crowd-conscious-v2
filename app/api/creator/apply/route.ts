import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    // Store application in creator_applications table
    const { data: application, error } = await supabase
      .from('creator_applications')
      .insert({
        full_name: body.fullName,
        email: body.email,
        phone: body.phone,
        organization_type: body.organizationType,
        organization_name: body.organizationName,
        experience_years: parseInt(body.experienceYears) || 0,
        past_projects: body.pastProjects,
        impact_metrics: body.impactMetrics,
        module_title: body.moduleTitle,
        module_topic: body.moduleTopic,
        core_value: body.coreValue,
        target_audience: body.targetAudience,
        unique_value: body.uniqueValue,
        lesson_count: parseInt(body.lessonCount) || 3,
        estimated_duration: parseInt(body.estimatedDuration) || 4,
        learning_objectives: body.learningObjectives,
        expected_outcomes: body.expectedOutcomes,
        proof_description: body.proofDescription,
        testimonials: body.testimonials,
        media_links: body.mediaLinks,
        time_commitment: body.timeCommitment,
        support_needed: body.supportNeeded,
        why_create: body.whyCreate,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating application:', error)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to applicant

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully'
    })

  } catch (error: any) {
    console.error('Error in creator application:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}

