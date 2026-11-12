import { copy } from '@/lib/ciceron/copy/es-MX'
import type { ReviewState } from '@/lib/ciceron/demo/fixtures'
import { ClientTag } from './ClientTag'
import { ReviewBadge } from './ReviewBadge'
import { SourceChip } from './SourceChip'

export function DisclosureCard({
  title,
  clientName,
  reason,
  action,
  passage,
  authority,
  type,
  subjectArea,
  date,
  officialUrl,
  review,
  showReviewBadge = false,
}: {
  title: string
  clientName: string
  reason: string
  action: string
  passage: string
  authority: string
  type: string
  subjectArea?: string
  date: string
  officialUrl: string
  review: ReviewState
  /** Only when a review task exists for this item — never for bare Tier 0. */
  showReviewBadge?: boolean
}) {
  return (
    <details className="cic-card">
      <summary>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 className="cic-h2 cic-serif" style={{ fontSize: '1.1rem' }}>
              {title}
            </h3>
            <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
              {copy.components.affects} <ClientTag name={clientName} />
              {' · '}
              {type}
              {subjectArea ? ` · ${subjectArea}` : ''}
              {' · '}
              {date}
            </p>
          </div>
          {showReviewBadge ? <ReviewBadge state={review} /> : null}
        </div>
      </summary>
      <div className="cic-card-level2">
        <p style={{ margin: 0 }}>
          <strong>{copy.components.why}.</strong> {reason}
        </p>
        <p style={{ margin: '8px 0 0' }}>
          <strong>{copy.components.action}.</strong> {action}
        </p>
      </div>
      <div className="cic-card-level3">
        <p className="cic-muted" style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600 }}>
          {copy.components.officialText}
        </p>
        <p className="cic-legal">
          <mark>{passage}</mark>
        </p>
        <div style={{ marginTop: 12 }}>
          <SourceChip authority={authority} type={type} date={date} href={officialUrl} />
        </div>
      </div>
    </details>
  )
}
