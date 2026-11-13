'use client'

import { useActionState } from 'react'
import {
  assignManualCheckAction,
  completeManualCheckAction,
  partnerSummaryPreviewAction,
  type BulletinActionState,
} from './actions'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatPolicyCell } from '@/lib/ciceron/audit/policy-labels'

function Feedback({ state }: { state: BulletinActionState | null }) {
  if (!state) return null
  if (!state.ok) {
    return (
      <div className="cic-policy-box is-denied" role="alert" style={{ marginTop: 8 }}>
        <strong>{copy.boletines.denied}</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
          {formatPolicyCell(state.policyId, state.policyReason)}
        </p>
        {state.policyId ? (
          <p className="cic-muted" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
            policy_id: {state.policyId}
          </p>
        ) : null}
      </div>
    )
  }
  if (state.partnerPreview) {
    return (
      <pre
        className="cic-card"
        style={{
          marginTop: 12,
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--cic-sans)',
          fontSize: '0.9rem',
        }}
      >
        {state.partnerPreview}
      </pre>
    )
  }
  if (state.message) {
    return (
      <p className="cic-muted" role="status" style={{ marginTop: 8, fontSize: '0.9rem' }}>
        {state.message}
      </p>
    )
  }
  return null
}

export function AssignButton({ checkId }: { checkId: string }) {
  const [state, action, pending] = useActionState(assignManualCheckAction, null)
  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="checkId" value={checkId} />
      <button type="submit" className="cic-btn" disabled={pending}>
        {copy.boletines.assign}
      </button>
      <Feedback state={state} />
    </form>
  )
}

export function CompleteButton({ checkId }: { checkId: string }) {
  const [state, action, pending] = useActionState(completeManualCheckAction, null)
  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="checkId" value={checkId} />
      <button type="submit" className="cic-btn" disabled={pending}>
        {copy.boletines.markDone}
      </button>
      <Feedback state={state} />
    </form>
  )
}

export function PartnerSummaryPreview() {
  const [state, action, pending] = useActionState(partnerSummaryPreviewAction, null)
  return (
    <section className="cic-section" aria-labelledby="partner-sum">
      <h2 id="partner-sum" className="cic-h2">
        {copy.boletines.partnerSummaryTitle}
      </h2>
      <p className="cic-muted">{copy.boletines.partnerSummaryNote}</p>
      <form action={action}>
        <button type="submit" className="cic-btn" disabled={pending}>
          {copy.boletines.partnerSummaryCta}
        </button>
      </form>
      <Feedback state={state} />
    </section>
  )
}
