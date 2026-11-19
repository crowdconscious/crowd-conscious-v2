import { NextRequest, NextResponse } from 'next/server'
import { markMorningUnsubscribed } from '@/lib/ciceron/engagement/morning-email-data'
import { verifyCiceronMorningUnsubToken } from '@/lib/ciceron/engagement/morning-email-unsub'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const firm = req.nextUrl.searchParams.get('firm') ?? ''
  const actor = req.nextUrl.searchParams.get('actor') ?? ''
  const token = req.nextUrl.searchParams.get('t') ?? ''

  if (!firm || !actor || !token || !verifyCiceronMorningUnsubToken(firm, actor, token)) {
    return new NextResponse(
      '<!DOCTYPE html><html lang="es-MX"><body><p>Enlace no válido.</p></body></html>',
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  await markMorningUnsubscribed(firm, actor)

  return new NextResponse(
    `<!DOCTYPE html><html lang="es-MX"><body style="font-family:system-ui;padding:2rem">
      <h1>Suscripción cancelada</h1>
      <p>Ya no recibirá el correo de la mañana de Cicerón.</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
