import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { OnboardingState } from '@/lib/ciceron/engagement/onboarding'

export function OnboardingChecklist({ state }: { state: OnboardingState }) {
  if (!state.visible) return null

  const steps = [
    {
      done: state.describedClient,
      label: copy.engagement.onboardingDescribe,
      href: '/ciceron/clientes',
    },
    {
      done: state.sawMatchedAlert,
      label: copy.engagement.onboardingAlert,
      href: '/ciceron/monitor-dof',
    },
    {
      done: state.sentAlertThroughReview,
      label: copy.engagement.onboardingReview,
      href: '/ciceron/revision',
    },
  ]

  return (
    <section className="cic-section" aria-labelledby="hoy-onboarding">
      <h2 id="hoy-onboarding" className="cic-h2">
        {copy.engagement.onboardingTitle}
      </h2>
      <p className="cic-muted" style={{ marginTop: 0 }}>
        {copy.engagement.onboardingLead}
      </p>
      <ol className="cic-onboarding-list">
        {steps.map((s) => (
          <li key={s.href} data-done={s.done ? 'true' : 'false'}>
            <span className="cic-onboarding-mark" aria-hidden>
              {s.done ? '[hecho]' : '[pendiente]'}
            </span>
            {s.done ? (
              <span>{s.label}</span>
            ) : (
              <Link href={s.href}>{s.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
