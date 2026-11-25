'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  stateDirectorySorted,
  type StateDirectoryEntry,
} from '@/lib/ciceron/boletines/state-directory'
import { uploadManualBulletinAction } from '@/app/ciceron/(rooms)/boletines/upload-actions'

function todayIsoCdmx(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export function ManualUploadDialog({
  open,
  onClose,
  initialStateCode,
  canUpload,
}: {
  open: boolean
  onClose: () => void
  initialStateCode?: string | null
  canUpload: boolean
}) {
  const router = useRouter()
  const states = useMemo(() => stateDirectorySorted(), [])
  const [stateCode, setStateCode] = useState(initialStateCode ?? 'CDMX')
  const [publicationDate, setPublicationDate] = useState(todayIsoCdmx())
  const [pastedText, setPastedText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [hitsLink, setHitsLink] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (initialStateCode) setStateCode(initialStateCode.toUpperCase())
  }, [initialStateCode])

  useEffect(() => {
    if (!open) {
      setMessage(null)
      setHitsLink(null)
      setFile(null)
      setPastedText('')
    }
  }, [open])

  if (!open) return null

  const selected: StateDirectoryEntry | undefined = states.find((s) => s.stateCode === stateCode)

  return (
    <div
      className="cic-palette-backdrop"
      role="presentation"
      onClick={onClose}
      style={{ zIndex: 80 }}
    >
      <div
        className="cic-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cic-upload-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560, width: 'min(560px, 94vw)', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--cic-rule)' }}>
          <h2 id="cic-upload-title" className="cic-h2" style={{ fontSize: '1.1rem' }}>
            {copy.boletines.uploadTitle}
          </h2>
          <p className="cic-muted" style={{ fontSize: '0.9rem', margin: '8px 0 0' }}>
            {copy.boletines.uploadLead}
          </p>
        </div>

        {!canUpload ? (
          <p style={{ padding: 16 }} role="status">
            {copy.boletines.uploadDenied}
          </p>
        ) : (
          <form
            style={{ padding: 16, display: 'grid', gap: 12 }}
            onSubmit={(e) => {
              e.preventDefault()
              setMessage(null)
              setHitsLink(null)
              const fd = new FormData()
              fd.set('stateCode', stateCode)
              fd.set('publicationDate', publicationDate)
              if (pastedText.trim()) fd.set('pastedText', pastedText)
              if (file) fd.set('file', file)
              start(async () => {
                const res = await uploadManualBulletinAction(fd)
                setMessage(res.message)
                if (res.ok && res.hitsFound && res.hitsFound > 0) {
                  setHitsLink(
                    `/ciceron/boletines?estado=${encodeURIComponent(stateCode)}`
                  )
                }
                if (res.ok) router.refresh()
              })
            }}
          >
            <label style={{ display: 'grid', gap: 4 }}>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.boletines.uploadState}
              </span>
              <select
                className="cic-input"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                required
              >
                {states.map((s) => (
                  <option key={s.stateCode} value={s.stateCode}>
                    {s.stateName}
                  </option>
                ))}
              </select>
            </label>

            {selected?.note ? (
              <p className="cic-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                {selected.note}
              </p>
            ) : null}

            <label style={{ display: 'grid', gap: 4 }}>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.boletines.uploadDate}
              </span>
              <input
                className="cic-input"
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.boletines.uploadFile}
              </span>
              <input
                className="cic-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.boletines.uploadPaste}
              </span>
              <textarea
                className="cic-input"
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={copy.boletines.uploadPastePlaceholder}
                style={{ width: '100%' }}
              />
            </label>

            {message ? (
              <p role="status" style={{ margin: 0 }}>
                {message}
                {hitsLink ? (
                  <>
                    {' · '}
                    <a href={hitsLink}>{copy.boletines.uploadOpenHits}</a>
                  </>
                ) : null}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="cic-btn cic-btn-secondary"
                onClick={onClose}
                disabled={pending}
              >
                {copy.boletines.uploadCancel}
              </button>
              <button type="submit" className="cic-btn" disabled={pending}>
                {copy.boletines.uploadSubmit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
