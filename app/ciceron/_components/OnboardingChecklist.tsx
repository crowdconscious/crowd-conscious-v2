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
    <details className="cic-section cic-secondary-panel">
      <summary className="cic-secondary-summary">
        <span className="cic-h2" style={{ fontSize: '1rem', margin: 0 }}>
          {copy.engagement.onboardingTitle}
        </span>
      </summary>
      <p className="cic-muted" style={{ marginTop: 8 }}>
        {copy.engagement.onboardingLead}
      </p>
      <ol className="cic-onboarding-list">
        {steps.map((s) => (
          <li key={s.href} data-done={s.done ? 'true' : 'false'}>
            <span
              className={s.done ? 'cic-onboarding-mark is-done' : 'cic-onboarding-mark is-pending'}
              aria-label={s.done ? copy.engagement.statusDone : copy.engagement.statusPending}
            >
              {s.done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M2.5 7.2 5.4 10l6-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <circle cx="7" cy="7" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </span>
            {s.done ? (
              <span>{s.label}</span>
            ) : (
              <Link href={s.href}>{s.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </details>
  )
}
