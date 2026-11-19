'use client'

import { useState, useTransition } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  approveClientNotifySim,
  confirmDeadlineAction,
  discardDeadlineAction,
  draftClientNotifyEmail,
} from '@/lib/ciceron/case-files/actions'
import { WhatsAppShareButton } from '../../../_components/WhatsAppShareButton'

export function DeadlineConfirm({
  caseId,
  deadlineId,
}: {
  caseId: string
  deadlineId: string
}) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      <button
        type="button"
        className="cic-btn"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const fd = new FormData()
            fd.set('caseId', caseId)
            fd.set('deadlineId', deadlineId)
            const r = await confirmDeadlineAction(fd)
            setMsg(r.message ?? null)
          })
        }}
      >
        {copy.expedientes.confirmDeadline}
      </button>
      <button
        type="button"
        className="cic-btn cic-btn-secondary"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const fd = new FormData()
            fd.set('caseId', caseId)
            fd.set('deadlineId', deadlineId)
            const r = await discardDeadlineAction(fd)
            setMsg(r.message ?? null)
          })
        }}
      >
        {copy.expedientes.discardDeadline}
      </button>
      {msg ? (
        <p className="cic-muted" style={{ fontSize: '0.8rem', width: '100%' }}>
          {msg}
        </p>
      ) : null}
    </div>
  )
}

export function ClientActions({
  caseId,
  matterId,
  clientName,
  fileNumber,
  eventText,
}: {
  caseId: string
  matterId: string
  clientName: string
  fileNumber: string
  eventText: string
}) {
  const [pending, start] = useTransition()
  const [compose, setCompose] = useState<{
    draftId: string
    toEmail: string
    subject: string
    body: string
    status: string
  } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <section className="cic-card" style={{ marginTop: 16 }}>
      <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
        {copy.expedientes.informarCliente}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          className="cic-btn"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const fd = new FormData()
              fd.set('caseId', caseId)
              fd.set('matterId', matterId)
              fd.set('clientName', clientName)
              fd.set('fileNumber', fileNumber)
              fd.set('eventText', eventText)
              fd.set('toEmail', 'contacto@cliente-demo.mx')
              const r = await draftClientNotifyEmail(fd)
              if (r.ok && r.payload) {
                setCompose({
                  draftId: String(r.payload.draftId),
                  toEmail: String(r.payload.toEmail),
                  subject: String(r.payload.subject),
                  body: String(r.payload.body),
                  status: String(r.payload.status),
                })
              }
              setMsg(r.message ?? null)
            })
          }}
        >
          {copy.m365.notifyCompose}
        </button>
      </div>

      {compose ? (
        <div className="cic-outlook-compose" style={{ marginTop: 16 }}>
          <h3 className="cic-h2" style={{ fontSize: '0.95rem' }}>
            {copy.m365.notifyPreview}
          </h3>
          <p className="cic-muted" style={{ fontSize: '0.8rem' }}>
            {copy.m365.notifyNote}
          </p>
          <div className="cic-outlook-window">
            <div className="cic-outlook-bar">Outlook · {copy.demoLabel}</div>
            <div className="cic-outlook-field">
              <span>Para</span>
              <strong>{compose.toEmail}</strong>
            </div>
            <div className="cic-outlook-field">
              <span>Asunto</span>
              <strong>{compose.subject}</strong>
            </div>
            <pre className="cic-outlook-body">{compose.body}</pre>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {compose.status !== 'enviado_simulado' ? (
              <button
                type="button"
                className="cic-btn"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    const fd = new FormData()
                    fd.set('draftId', compose.draftId)
                    const r = await approveClientNotifySim(fd)
                    if (r.ok) {
                      setCompose({ ...compose, status: 'enviado_simulado' })
                    }
                    setMsg(r.message ?? null)
                  })
                }}
              >
                {copy.m365.notifyApprove}
              </button>
            ) : (
              <p className="cic-muted" style={{ margin: 0 }}>
                {copy.m365.notifySent}
              </p>
            )}
            <WhatsAppShareButton
              clientName={clientName}
              headline={compose.subject}
              detail={compose.body.slice(0, 500)}
            />
          </div>
          <p className="cic-muted" style={{ fontSize: '0.75rem', marginTop: 6 }}>
            {copy.whatsapp.sendNote}
          </p>
        </div>
      ) : null}

      {msg ? (
        <p className="cic-muted" style={{ fontSize: '0.85rem', marginTop: 10 }}>
          {msg}
        </p>
      ) : null}
    </section>
  )
}
