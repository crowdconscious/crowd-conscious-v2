'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  connectOutlookSim,
  disconnectOutlookSim,
} from '@/lib/ciceron/case-files/actions'
import type { M365ConnectionStatus } from '@/lib/ciceron/m365/types'

export function OutlookConnectControls({ status }: { status: M365ConnectionStatus }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {status !== 'connected' ? (
        <button
          type="button"
          className="cic-btn"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await connectOutlookSim()
              setMsg(r.message ?? null)
              router.refresh()
            })
          }}
        >
          {copy.m365.consentAccept}
        </button>
      ) : (
        <>
          <span className="cic-review cic-review-aprobado">{copy.m365.connected}</span>
          <button
            type="button"
            className="cic-btn cic-btn-secondary"
            disabled={pending}
            onClick={() => {
              start(async () => {
                const r = await disconnectOutlookSim()
                setMsg(r.message ?? null)
                router.refresh()
              })
            }}
          >
            {copy.m365.disconnect}
          </button>
        </>
      )}
      <a href="/ciceron/expedientes" className="cic-btn cic-btn-secondary">
        {copy.m365.consentCancel}
      </a>
      {msg ? (
        <p className="cic-muted" style={{ width: '100%', fontSize: '0.85rem' }}>
          {msg}
        </p>
      ) : null}
    </div>
  )
}
