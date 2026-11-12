'use client'

import { useState, useTransition } from 'react'
import { resetDemoFirmAction } from '../../actions'
import { copy } from '@/lib/ciceron/copy/es-MX'

export function ResetDemoButton() {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div>
      <button
        type="button"
        className="cic-btn"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await resetDemoFirmAction()
            setMessage(
              res.ok
                ? copy.adminVentas.resetDone
                : res.message ?? copy.adminVentas.resetDenied
            )
          })
        }}
      >
        {copy.adminVentas.resetCta}
      </button>
      {message ? (
        <p className="cic-muted" role="status" style={{ marginTop: 8 }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
