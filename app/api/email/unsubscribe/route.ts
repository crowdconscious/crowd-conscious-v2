import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyUnsubscribeToken } from '@/lib/email-unsubscribe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

/** One-click unsubscribe from prediction marketing emails (sets profiles.email_notifications = false). */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('user')
  const token = request.nextUrl.searchParams.get('token')
  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return new NextResponse('Enlace inválido o expirado.', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update({ email_notifications: false }).eq('id', userId)
    if (error) {
      console.error('[unsubscribe]', error)
      return new NextResponse('No se pudo actualizar la preferencia.', { status: 500 })
    }
  } catch (e) {
    console.error('[unsubscribe]', e)
    return new NextResponse('Error del servidor.', { status: 500 })
  }

  return NextResponse.redirect(`${APP_URL}/settings?email_notifications=off`, 302)
}
