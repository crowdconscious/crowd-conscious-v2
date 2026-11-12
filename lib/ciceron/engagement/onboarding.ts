/**
 * Firm onboarding checklist: describe a client → see matched alert → send through review.
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

export type OnboardingState = {
  describedClient: boolean
  sawMatchedAlert: boolean
  sentAlertThroughReview: boolean
  complete: boolean
  visible: boolean
  source: 'schema' | 'fixture'
}

const FIXTURE_INCOMPLETE: OnboardingState = {
  describedClient: true,
  sawMatchedAlert: true,
  sentAlertThroughReview: false,
  complete: false,
  visible: true,
  source: 'fixture',
}

export async function loadOnboarding(
  persona: DemoPersona
): Promise<OnboardingState> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return FIXTURE_INCOMPLETE

  try {
    const { data, error } = await db
      .from('firm_onboarding')
      .select(
        'described_client, saw_matched_alert, sent_alert_through_review, completed_at'
      )
      .eq('firm_id', persona.firmId)
      .limit(1)

    if (error || !Array.isArray(data) || !data[0]) return FIXTURE_INCOMPLETE

    const row = data[0] as {
      described_client: boolean
      saw_matched_alert: boolean
      sent_alert_through_review: boolean
      completed_at: string | null
    }
    const complete =
      Boolean(row.completed_at) ||
      (row.described_client &&
        row.saw_matched_alert &&
        row.sent_alert_through_review)

    return {
      describedClient: row.described_client,
      sawMatchedAlert: row.saw_matched_alert,
      sentAlertThroughReview: row.sent_alert_through_review,
      complete,
      visible: !complete,
      source: 'schema',
    }
  } catch {
    return FIXTURE_INCOMPLETE
  }
}

export async function markOnboardingStep(
  persona: DemoPersona,
  step: 'described_client' | 'saw_matched_alert' | 'sent_alert_through_review'
): Promise<OnboardingState> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    const next = { ...FIXTURE_INCOMPLETE, [camel(step)]: true }
    next.complete =
      next.describedClient && next.sawMatchedAlert && next.sentAlertThroughReview
    next.visible = !next.complete
    return next
  }

  const patch: Record<string, unknown> = { [step]: true, updated_at: new Date().toISOString() }
  await db.from('firm_onboarding').upsert(
    {
      firm_id: persona.firmId,
      is_demo: true,
      described_client: step === 'described_client',
      saw_matched_alert: step === 'saw_matched_alert',
      sent_alert_through_review: step === 'sent_alert_through_review',
      ...Object.fromEntries(
        (
          [
            'described_client',
            'saw_matched_alert',
            'sent_alert_through_review',
          ] as const
        )
          .filter((k) => k !== step)
          .map((k) => [k, undefined])
      ),
    },
    { onConflict: 'firm_id' }
  )

  // Re-read and merge flags without wiping others
  const current = await loadOnboarding(persona)
  const merged = {
    described_client: step === 'described_client' ? true : current.describedClient,
    saw_matched_alert: step === 'saw_matched_alert' ? true : current.sawMatchedAlert,
    sent_alert_through_review:
      step === 'sent_alert_through_review' ? true : current.sentAlertThroughReview,
  }
  const complete =
    merged.described_client &&
    merged.saw_matched_alert &&
    merged.sent_alert_through_review

  await db
    .from('firm_onboarding')
    .update({
      ...merged,
      completed_at: complete ? new Date().toISOString() : null,
      is_demo: true,
    })
    .eq('firm_id', persona.firmId)

  void patch
  return loadOnboarding(persona)
}

function camel(
  step: 'described_client' | 'saw_matched_alert' | 'sent_alert_through_review'
): keyof OnboardingState {
  if (step === 'described_client') return 'describedClient'
  if (step === 'saw_matched_alert') return 'sawMatchedAlert'
  return 'sentAlertThroughReview'
}
