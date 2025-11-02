import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.user_type !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { moduleId, action, reviewNotes } = await request.json()

    if (!moduleId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Fetch module details
    const { data: module, error: moduleError } = await (supabase as any)
      .from('marketplace_modules')
      .select(`
        *,
        communities (name),
        profiles (full_name, email)
      `)
      .eq('id', moduleId)
      .single()

    if (moduleError || !module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Update module status
    const newStatus = action === 'approve' ? 'published' : 'draft'
    const updates: any = {
      status: newStatus,
      approved_by: user.id,
      approval_date: new Date().toISOString()
    }

    if (action === 'approve') {
      updates.published_at = new Date().toISOString()
    }

    const { error: updateError } = await (supabase as any)
      .from('marketplace_modules')
      .update(updates)
      .eq('id', moduleId)

    if (updateError) {
      console.error('Error updating module:', updateError)
      return NextResponse.json({ error: 'Failed to update module' }, { status: 500 })
    }

    // Send email notification to creator
    try {
      const creatorEmail = module.profiles?.email
      const creatorName = module.profiles?.full_name || 'Creador'
      const communityName = module.communities?.name || 'tu comunidad'

      if (creatorEmail) {
        if (action === 'approve') {
          await resend.emails.send({
            from: 'Crowd Conscious <notificaciones@crowdconscious.app>',
            to: creatorEmail,
            subject: `🎉 ¡Tu módulo "${module.title}" ha sido aprobado!`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success-badge { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 8px; text-align: center; font-weight: 600; margin: 20px 0; }
                    .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
                      <h1 style="margin: 0; font-size: 32px;">¡Felicidades, ${creatorName}!</h1>
                      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Tu módulo ha sido aprobado</p>
                    </div>
                    
                    <div class="content">
                      <div class="success-badge">
                        ✅ Módulo Aprobado y Publicado
                      </div>
                      
                      <p style="font-size: 16px; color: #1e293b;">
                        Nos complace informarte que tu módulo <strong>"${module.title}"</strong> ha sido revisado y aprobado por nuestro equipo.
                      </p>
                      
                      <p style="font-size: 16px; color: #1e293b;">
                        Tu módulo ya está disponible en el marketplace de Crowd Conscious y las corporaciones pueden comenzar a adquirirlo para capacitar a sus empleados.
                      </p>
                      
                      ${reviewNotes ? `
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                          <div style="font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            Comentarios del Revisor
                          </div>
                          <p style="margin: 0; color: #1e293b;">${reviewNotes}</p>
                        </div>
                      ` : ''}
                      
                      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0 0 15px 0; color: #1e293b;">Próximos Pasos:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569;">
                          <li style="margin-bottom: 8px;">Tu módulo aparecerá en el marketplace dentro de las próximas 24 horas</li>
                          <li style="margin-bottom: 8px;">Comenzarás a recibir el 20% de cada venta (o 70% si donas tu parte a ${communityName})</li>
                          <li style="margin-bottom: 8px;">Podrás ver las estadísticas y ventas en tu panel de comunidad</li>
                          <li style="margin-bottom: 8px;">Recibirás notificaciones cuando corporaciones adquieran tu módulo</li>
                        </ul>
                      </div>
                      
                      <div style="text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'}/marketplace/${module.slug}" class="button">
                          Ver Mi Módulo en el Marketplace →
                        </a>
                      </div>
                      
                      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
                        <strong style="color: #1e40af;">💡 Consejo:</strong>
                        <p style="margin: 5px 0 0 0; color: #1e3a8a;">
                          Comparte tu módulo en redes sociales para aumentar su visibilidad. ¡Cada venta beneficia a tu comunidad!
                        </p>
                      </div>
                    </div>
                    
                    <div class="footer">
                      <p><strong>Crowd Conscious</strong><br>
                      Empoderando comunidades a través del conocimiento</p>
                      <p style="font-size: 12px; color: #94a3b8;">
                        ¿Tienes preguntas? Responde a este correo o contáctanos en comunidad@crowdconscious.app
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `
          })
        } else {
          // Rejection email
          await resend.emails.send({
            from: 'Crowd Conscious <notificaciones@crowdconscious.app>',
            to: creatorEmail,
            subject: `📝 Tu módulo "${module.title}" requiere ajustes`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .warning-badge { background: #fef3c7; color: #92400e; padding: 15px; border-radius: 8px; text-align: center; font-weight: 600; margin: 20px 0; }
                    .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div style="font-size: 60px; margin-bottom: 10px;">📝</div>
                      <h1 style="margin: 0; font-size: 32px;">Hola, ${creatorName}</h1>
                      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Actualización sobre tu módulo</p>
                    </div>
                    
                    <div class="content">
                      <div class="warning-badge">
                        ⚠️ Módulo Requiere Ajustes
                      </div>
                      
                      <p style="font-size: 16px; color: #1e293b;">
                        Gracias por enviar tu módulo <strong>"${module.title}"</strong> para revisión.
                      </p>
                      
                      <p style="font-size: 16px; color: #1e293b;">
                        Después de revisar tu contenido, hemos identificado algunas áreas que necesitan mejoras antes de poder publicarlo en el marketplace.
                      </p>
                      
                      ${reviewNotes ? `
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                          <div style="font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            Comentarios del Revisor
                          </div>
                          <p style="margin: 0; color: #1e293b;">${reviewNotes}</p>
                        </div>
                      ` : ''}
                      
                      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0 0 15px 0; color: #1e293b;">Próximos Pasos:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #475569;">
                          <li style="margin-bottom: 8px;">Revisa los comentarios del revisor cuidadosamente</li>
                          <li style="margin-bottom: 8px;">Realiza los ajustes necesarios en tu módulo</li>
                          <li style="margin-bottom: 8px;">Vuelve a enviar tu módulo para revisión</li>
                          <li style="margin-bottom: 8px;">Nuestro equipo lo revisará nuevamente en 2-3 días hábiles</li>
                        </ul>
                      </div>
                      
                      <div style="text-align: center;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'}/communities/${module.creator_community_id}/modules" class="button">
                          Editar Mi Módulo →
                        </a>
                      </div>
                      
                      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin-top: 20px;">
                        <strong style="color: #1e40af;">💡 Recuerda:</strong>
                        <p style="margin: 5px 0 0 0; color: #1e3a8a;">
                          Queremos que tu módulo tenga éxito. Estos ajustes ayudarán a garantizar la mejor experiencia para las corporaciones y sus empleados.
                        </p>
                      </div>
                    </div>
                    
                    <div class="footer">
                      <p><strong>Crowd Conscious</strong><br>
                      Empoderando comunidades a través del conocimiento</p>
                      <p style="font-size: 12px; color: #94a3b8;">
                        ¿Tienes preguntas sobre los comentarios? Responde a este correo o contáctanos en comunidad@crowdconscious.app
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `
          })
        }
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      action,
      moduleId,
      newStatus
    })
  } catch (error) {
    console.error('Error in POST /api/admin/modules/review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

