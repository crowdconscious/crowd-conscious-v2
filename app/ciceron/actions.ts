'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CICERON_DEMO_COOKIE } from '@/lib/ciceron/config'
import { resolvePersonaByInvite } from '@/lib/ciceron/demo/session'

export async function redeemCiceronInvite(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const code = String(formData.get('code') ?? '')
  const persona = await resolvePersonaByInvite(code)
  if (!persona) {
    return { ok: false, error: 'invalid' }
  }

  const jar = await cookies()
  jar.set(CICERON_DEMO_COOKIE, persona.inviteCode, {
    path: '/ciceron',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    httpOnly: true,
  })

  redirect('/ciceron/hoy')
}
