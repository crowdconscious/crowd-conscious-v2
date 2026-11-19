'use client'

import { useState, useTransition } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  createGoogleClientDraftAction,
  listGoogleCalendarAction,
} from '@/lib/ciceron/integrations/actions'

type CalEvent = { id: string; summary: string; start: string }

/** Visible live actions once Google OAuth tokens are stored server-side. */
export function GoogleLiveActions() {
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [events, setEvents] = useState<CalEvent[]>([])

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className="cic-btn"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await createGoogleClientDraftAction()
              setMessage(r.message)
            })
          }}
        >
          {copy.integrations.createGmailDraft}
        </button>
        <button
          type="button"
          className="cic-btn cic-btn-secondary"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await listGoogleCalendarAction()
              setMessage(r.message)
              setEvents(r.events)
            })
          }}
        >
          {copy.integrations.listCalendar}
        </button>
      </div>
      <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
        {copy.integrations.liveActionsNote}
      </p>
      {message ? (
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>{message}</p>
      ) : null}
      {events.length > 0 ? (
        <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: '0.85rem' }}>
          {events.map((e) => (
            <li key={e.id}>
              {e.start ? `${e.start} — ` : ''}
              {e.summary}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
