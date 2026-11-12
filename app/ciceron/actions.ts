'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CICERON_DEMO_COOKIE } from '@/lib/ciceron/config'
import { redeemInviteCode, switchPersona } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { advanceGuidedStory } from '@/lib/ciceron/demo/guided-story'
import type { GuidedStoryStep } from '@/lib/ciceron/demo/guided-story-pure'
import { getCiceronDemoSessionFull } from '@/lib/ciceron/demo/session'
import { tryAccessDemo } from '@/lib/ciceron/demo/access'
import { resetDemoFirm } from '@/lib/ciceron/demo/sales'
import { revalidatePath } from 'next/cache'

export async function redeemCiceronInvite(
  _prev: { ok: boolean; error?: string } | null,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const code = String(formData.get('code') ?? '')
  const workEmailRaw = String(formData.get('workEmail') ?? '').trim()
  const workEmail = workEmailRaw.length > 0 ? workEmailRaw : null

  const result = await redeemInviteCode({ code, workEmail })
  if (!result.ok) {
    return { ok: false, error: 'invalid' }
  }

  const jar = await cookies()
  jar.set(CICERON_DEMO_COOKIE, result.token, {
    path: '/ciceron',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
    httpOnly: true,
  })

  await recordCiceronEvent({
    name: 'invite_redeemed',
    firmId: result.session.persona.firmId,
    userId: result.session.persona.id,
    properties: {
      invite_role: result.session.persona.role,
      is_demo: true,
    },
  })

  redirect('/ciceron/hoy')
}

export async function switchCiceronPersona(formData: FormData): Promise<void> {
  const personaId = String(formData.get('personaId') ?? '')
  const result = await switchPersona(personaId)
  if (result.ok) {
    await recordCiceronEvent({
      name: 'persona_switched',
      firmId: result.persona.firmId,
      userId: result.persona.id,
      properties: {
        persona_role: result.persona.role as 'socio' | 'asociado' | 'pasante',
        is_demo: true,
      },
    })
  }
  revalidatePath('/ciceron', 'layout')
  redirect('/ciceron/hoy')
}

export async function guidedStoryAction(formData: FormData): Promise<void> {
  const session = await getCiceronDemoSessionFull()
  if (!session) redirect('/ciceron')

  const dismiss = formData.get('dismiss') === '1'
  const stepRaw = Number(formData.get('step') ?? '1')
  const step = (Number.isFinite(stepRaw) ? stepRaw : 1) as GuidedStoryStep

  await advanceGuidedStory(session, step, { dismiss })
  revalidatePath('/ciceron', 'layout')

  if (dismiss) {
    redirect('/ciceron/hoy')
  }
  const href = String(formData.get('href') ?? '/ciceron/hoy')
  redirect(href.startsWith('/ciceron') ? href : '/ciceron/hoy')
}

export async function tryAccessAction(
  _prev: { scenario: 'rbac' | 'abac'; result: Awaited<ReturnType<typeof tryAccessDemo>> } | null,
  formData: FormData
): Promise<{ scenario: 'rbac' | 'abac'; result: Awaited<ReturnType<typeof tryAccessDemo>> }> {
  const session = await getCiceronDemoSessionFull()
  if (!session) {
    return {
      scenario: 'rbac',
      result: {
        ok: false,
        scenario: 'rbac',
        explainer: '',
        allowed: { ok: false },
        denied: { ok: false, policyReason: 'Sin sesión.' },
      },
    }
  }
  const scenario = formData.get('scenario') === 'abac' ? 'abac' : 'rbac'
  const result = await tryAccessDemo(session.persona, scenario)
  await recordCiceronEvent({
    name: 'access_demo_tried',
    firmId: session.persona.firmId,
    userId: session.persona.id,
    properties: {
      model: scenario,
      verdict: result.denied.ok === false ? 'denied' : 'allowed',
      is_demo: true,
    },
  })
  return { scenario, result }
}

export async function resetDemoFirmAction(): Promise<{ ok: boolean; message?: string }> {
  const session = await getCiceronDemoSessionFull()
  if (!session) return { ok: false, message: 'Sin sesión.' }
  if (session.persona.role !== 'admin') {
    return { ok: false, message: 'Solo un administrador puede restablecer la demostración.' }
  }
  const result = await resetDemoFirm(session.persona)
  revalidatePath('/ciceron/admin/ventas')
  if (!result.ok) return { ok: false, message: result.message }
  return { ok: true }
}
