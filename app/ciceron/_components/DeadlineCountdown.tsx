import { deadlineCountdown } from '@/lib/ciceron/deadlines/countdown-pure'
import { copy } from '@/lib/ciceron/copy/es-MX'

const LEVEL_WORD = copy.hoy.countdown

export function DeadlineCountdown({
  dueAt,
  dueLabel,
  label,
}: {
  dueAt: string
  dueLabel?: string
  label?: string
}) {
  const cd = deadlineCountdown(dueAt)
  const daysText =
    cd.businessDaysRemaining <= 0
      ? null
      : cd.businessDaysRemaining === 1
        ? LEVEL_WORD.dayOne
        : `${cd.businessDaysRemaining} ${LEVEL_WORD.days}`

  return (
    <div
      className={`cic-deadline-countdown is-${cd.level}`}
      role="status"
      aria-label={`${LEVEL_WORD[cd.level]}${daysText ? `, ${daysText} ${LEVEL_WORD.remaining}` : ''}${dueLabel ? `, ${dueLabel}` : ''}`}
    >
      <span className="cic-deadline-countdown-word">{LEVEL_WORD[cd.level]}</span>
      {daysText ? (
        <span className="cic-deadline-countdown-days">
          {cd.businessDaysRemaining === 1 ? (
            <span>
              <span className="cic-deadline-countdown-num">1</span> {LEVEL_WORD.dayOne.replace(/^1\s*/, '')}{' '}
              {LEVEL_WORD.remaining}
            </span>
          ) : (
            <span>
              <span className="cic-deadline-countdown-num">{cd.businessDaysRemaining}</span>{' '}
              {LEVEL_WORD.days} {LEVEL_WORD.remaining}
            </span>
          )}
        </span>
      ) : null}
      {dueLabel ? (
        <span className="cic-deadline-countdown-due">{dueLabel}</span>
      ) : null}
      {label ? <span className="cic-deadline-countdown-label">{label}</span> : null}
    </div>
  )
}
