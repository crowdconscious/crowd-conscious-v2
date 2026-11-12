'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { createDeliveryAction } from '@/lib/ciceron/review/actions'
import type { DeliveryPreview } from '@/lib/ciceron/review/types'

export function DeliveryConfirm({ preview }: { preview: DeliveryPreview }) {
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit() {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await createDeliveryAction({
        taskId: preview.taskId,
        aiOutputId: preview.aiOutputId,
        matterId: preview.matterId,
        channel: preview.channel,
        recipient: preview.recipient,
        subject: preview.subject,
        body: preview.body,
        confirm: confirmed,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setMessage(result.message ?? copy.delivery.success)
      router.refresh()
    })
  }

  return (
    <div className="cic-delivery">
      <p className="cic-callout" role="note">
        {copy.delivery.simulated}
      </p>

      {message ? (
        <p className="cic-flash cic-flash-ok" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="cic-flash cic-flash-err" role="alert">
          {error}
        </p>
      ) : null}

      <dl className="cic-delivery-meta">
        <div>
          <dt>{copy.delivery.channel}</dt>
          <dd>{preview.channel}</dd>
        </div>
        <div>
          <dt>{copy.delivery.to}</dt>
          <dd>{preview.recipient}</dd>
        </div>
        <div>
          <dt>{copy.table.client}</dt>
          <dd>{preview.clientName}</dd>
        </div>
        <div>
          <dt>{copy.delivery.subject}</dt>
          <dd>{preview.subject}</dd>
        </div>
      </dl>

      <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
        {copy.delivery.body}
      </h2>
      <article className="cic-legal cic-review-body">{preview.body}</article>

      <label className="cic-check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          {copy.delivery.confirm}
          <span className="cic-muted" style={{ display: 'block', fontSize: '0.85rem' }}>
            {copy.delivery.confirmHint}
          </span>
        </span>
      </label>

      <div className="cic-review-actions">
        <button
          type="button"
          className="cic-btn"
          disabled={!confirmed || pending}
          onClick={onSubmit}
        >
          {copy.delivery.submit}
        </button>
        <Link
          className="cic-btn cic-btn-secondary"
          href={`${CICERON_BASE}/revision/${preview.taskId}`}
        >
          {copy.delivery.back}
        </Link>
      </div>
    </div>
  )
}
