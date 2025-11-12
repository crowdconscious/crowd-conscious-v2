import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return ApiResponse.unauthorized('Please log in to create modules')
    }

    const supabase = await createClient()
    const body = await request.json()

    const {
      title,
      description,
      coreValue,
      difficulty,
      estimatedHours,
      xpReward,
      thumbnailUrl,
      industryTags,
      basePriceMxn,
      pricePer50,
      lessons,
      communityId,
      userId,
      status
    } = body

    // Validate required fields
    if (!title || !description || !coreValue || !communityId || !userId) {
      return ApiResponse.badRequest('Missing required fields', 'MISSING_REQUIRED_FIELDS')
    }

    // Validate community membership
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single()

    if (!membership || (membership.role !== 'founder' && membership.role !== 'admin')) {
      return ApiResponse.forbidden('You must be a community admin to create modules', 'NOT_COMMUNITY_ADMIN')
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Fetch community name for creator_name
    const { data: communityData } = await supabase
      .from('communities')
      .select('name')
      .eq('id', communityId)
      .single()

    // Create the module
    const { data: module, error: moduleError } = await (supabase as any)
      .from('marketplace_modules')
      .insert({
        title,
        description,
        slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
        creator_community_id: communityId,
        creator_user_id: userId,
        creator_name: communityData?.name || 'Community',
        core_value: coreValue,
        difficulty_level: difficulty,
        estimated_duration_hours: estimatedHours,
        xp_reward: xpReward,
        thumbnail_url: thumbnailUrl || null,
        industry_tags: industryTags || [],
        base_price_mxn: basePriceMxn,
        price_per_50_employees: pricePer50,
        status: status || 'draft',
        purchase_count: 0,
        enrollment_count: 0,
        avg_rating: 0,
        review_count: 0
      })
      .select()
      .single()

    if (moduleError) {
      console.error('Error creating module:', moduleError)
      console.error('Module data:', { title, description, slug, communityId, userId })
      return ApiResponse.serverError('Failed to create module', 'MODULE_CREATION_ERROR', { 
        message: moduleError.message,
        code: moduleError.code
      })
    }

    // Create lessons if any
    if (lessons && lessons.length > 0) {
      const lessonsData = lessons.map((lesson: any, index: number) => ({
        module_id: module.id,
        lesson_number: index + 1,
        title: lesson.title,
        description: lesson.description,
        estimated_minutes: lesson.estimatedMinutes,
        xp_reward: lesson.xpReward,
        story_intro: lesson.storyIntro || null,
        key_points: lesson.keyPoints.filter((p: string) => p.trim() !== ''),
        activity_type: lesson.activityType || 'reflection',
        tools_used: lesson.toolsUsed || [],
        resources: lesson.resources || []
      }))

      const { error: lessonsError } = await (supabase as any)
        .from('module_lessons')
        .insert(lessonsData)

      if (lessonsError) {
        console.error('Error creating lessons:', lessonsError)
        // Don't fail the entire request, just log the error
        // Module is created, lessons can be added later
      }
    }

    // Send email notification if submitted for review
    if (status === 'review') {
      try {
        // Fetch community details
        const { data: community } = await supabase
          .from('communities')
          .select('name')
          .eq('id', communityId)
          .single()

        // Fetch user details
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single()

        await resend.emails.send({
          from: 'Crowd Conscious <comunidad@crowdconscious.app>',
          to: 'comunidad@crowdconscious.app',
          subject: `🎓 Nuevo Módulo para Revisión: ${title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                  .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                  .module-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
                  .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                  .value { font-size: 16px; color: #1e293b; margin: 5px 0 15px 0; }
                  .button { display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                  .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">📚 Nuevo Módulo para Revisión</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Un creador ha enviado un módulo para aprobación</p>
                  </div>
                  
                  <div class="content">
                    <div class="module-card">
                      <div class="label">Título del Módulo</div>
                      <div class="value" style="font-size: 20px; font-weight: 600; color: #0d9488;">${title}</div>
                      
                      <div class="label">Descripción</div>
                      <div class="value">${description}</div>
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                          <div class="label">Valor Central</div>
                          <div class="value">${coreValue.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
                        </div>
                        <div>
                          <div class="label">Nivel</div>
                          <div class="value">${difficulty === 'beginner' ? 'Principiante' : difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}</div>
                        </div>
                      </div>
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                        <div>
                          <div class="label">Duración</div>
                          <div class="value">${estimatedHours} horas</div>
                        </div>
                        <div>
                          <div class="label">Lecciones</div>
                          <div class="value">${lessons?.length || 0} lecciones</div>
                        </div>
                      </div>
                      
                      <div style="margin-top: 15px;">
                        <div class="label">Precio Base</div>
                        <div class="value">$${basePriceMxn?.toLocaleString()} MXN</div>
                      </div>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <div class="label">Creador</div>
                      <div class="value">
                        <strong>${userProfile?.full_name || 'Usuario'}</strong><br>
                        ${userProfile?.email || ''}<br>
                        Comunidad: <strong>${community?.name || 'Desconocida'}</strong>
                      </div>
                    </div>
                    
                    <div style="text-align: center;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'}/admin" class="button">
                        Ir al Panel de Administración →
                      </a>
                    </div>
                    
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-top: 20px;">
                      <strong style="color: #92400e;">⚠️ Acción Requerida:</strong>
                      <p style="margin: 5px 0 0 0; color: #78350f;">Este módulo está esperando tu revisión y aprobación antes de ser publicado en el marketplace.</p>
                    </div>
                  </div>
                  
                  <div class="footer">
                    <p><strong>Crowd Conscious</strong><br>
                    Conectando comunidades con impacto corporativo</p>
                    <p style="font-size: 12px; color: #94a3b8;">
                      Este es un correo automático generado por el sistema de módulos.<br>
                      Para revisar y aprobar módulos, inicia sesión en el panel de administración.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `
        })
      } catch (emailError) {
        console.error('Error sending review notification email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return ApiResponse.created({
      module: {
        id: module.id,
        slug: module.slug,
        status: module.status
      }
    })
  } catch (error: any) {
    console.error('Error in POST /api/modules/create:', error)
    return ApiResponse.serverError('Internal server error', 'MODULE_CREATION_SERVER_ERROR', { message: error.message })
  }
}

