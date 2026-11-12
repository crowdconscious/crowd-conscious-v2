'use server'

import { revalidatePath } from 'next/cache'
import { applyWatchProfileSuggestion } from '@/lib/ciceron/engagement/feedback-loop'
import { markOnboardingStep } from '@/lib/ciceron/engagement/onboarding'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export async function applyFeedbackSuggestionAction(
  watchProfileId: string,
  reasonCode: string
) {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false as const, message: 'auth' }
  const res = await applyWatchProfileSuggestion(persona, watchProfileId, reasonCode)
  if (res.ok) {
    revalidatePath('/ciceron/hoy')
    revalidatePath('/ciceron/clientes')
  }
  return res
}

export async function completeOnboardingStepAction(
  step: 'described_client' | 'saw_matched_alert' | 'sent_alert_through_review'
) {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false as const }
  await markOnboardingStep(persona, step)
  revalidatePath('/ciceron/hoy')
  return { ok: true as const }
}
