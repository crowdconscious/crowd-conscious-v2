'use client'

import { useFormStatus } from 'react-dom'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  prepareClientAlert,
  submitMatchFeedback,
} from '../(rooms)/monitor-dof/actions'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="cic-btn" disabled={pending} style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
      {pending ? copy.components.loading : label}
    </button>
  )
}

async function onFeedback(formData: FormData) {
  await submitMatchFeedback(formData)
}

async function onPrepareAlert(formData: FormData) {
  await prepareClientAlert(formData)
}

export function MatchActions({ matchId }: { matchId: string }) {
  return (
    <div className="cic-stack" style={{ marginTop: 16 }}>
      <form action={onFeedback} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
        <input type="hidden" name="matchId" value={matchId} />
        <label style={{ flex: '1 1 160px' }}>
          <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
            {copy.monitor.feedbackReason}
          </span>
          <input name="reason" className="cic-input" style={{ marginTop: 4 }} />
        </label>
        <button
          type="submit"
          name="verdict"
          value="relevante"
          className="cic-btn"
          style={{ fontSize: '0.85rem', padding: '8px 12px' }}
        >
          {copy.monitor.relevant}
        </button>
        <button
          type="submit"
          name="verdict"
          value="no_relevante"
          className="cic-btn cic-btn-secondary"
          style={{ fontSize: '0.85rem', padding: '8px 12px' }}
        >
          {copy.monitor.notRelevant}
        </button>
      </form>

      <form action={onPrepareAlert}>
        <input type="hidden" name="matchId" value={matchId} />
        <SubmitButton label={copy.monitor.prepareAlert} />
        <p className="cic-muted" style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>
          {copy.monitor.prepareAlertNote}
        </p>
      </form>
    </div>
  )
}
