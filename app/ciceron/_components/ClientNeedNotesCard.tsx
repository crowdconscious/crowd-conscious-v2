'use client'

import { useState, useTransition } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { submitClientNeedNoteAction } from '@/app/ciceron/actions-client-notes'

export function ClientNeedNotesCard({
  context,
}: {
  context: 'hoy' | 'boletines' | 'preferencias' | 'general'
}) {
  const [body, setBody] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <section className="cic-card cic-section" aria-live="polite">
        <p style={{ margin: 0 }}>{copy.clientNotes.success}</p>
      </section>
    )
  }

  return (
    <section className="cic-card cic-section" aria-labelledby={`cic-notes-${context}`}>
      <h2 id={`cic-notes-${context}`} className="cic-h2" style={{ fontSize: '1.05rem' }}>
        {copy.clientNotes.title}
      </h2>
      <p className="cic-muted" style={{ fontSize: '0.9rem', maxWidth: '40rem' }}>
        {copy.clientNotes.lead}
      </p>
      <form
        style={{ marginTop: 12, display: 'grid', gap: 10 }}
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          start(async () => {
            const res = await submitClientNeedNoteAction({ context, body })
            if (res.ok) {
              setDone(true)
              setBody('')
            } else {
              setError(res.message ?? copy.clientNotes.error)
            }
          })
        }}
      >
        <label style={{ display: 'block' }}>
          <span className="cic-sr-only">{copy.clientNotes.title}</span>
          <textarea
            className="cic-input"
            name="body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            required
            placeholder={copy.clientNotes.placeholder}
            style={{ width: '100%' }}
          />
        </label>
        {error ? (
          <p className="cic-muted" role="alert" style={{ color: 'var(--cic-danger, #b42318)' }}>
            {error}
          </p>
        ) : null}
        <div>
          <button type="submit" className="cic-btn" disabled={pending || body.trim().length < 1}>
            {pending ? copy.clientNotes.submitting : copy.clientNotes.submit}
          </button>
        </div>
      </form>
    </section>
  )
}
