'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  PRO_DEMO_CLIENTS,
  buildProDraft,
  buildProSuggestions,
  parseProIntent,
  type ProPersonaRole,
} from '@/lib/ciceron/demo/pro-assistant-pure'

export function ProAssistantButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="cic-pro-btn" onClick={onOpen}>
      <span className="cic-pro-btn-badge">{copy.pro.badge}</span>
      <span>{copy.pro.open}</span>
    </button>
  )
}

export function ProAssistant({
  open,
  onClose,
  role = 'socio',
  plazosSoonCount = 1,
  clientsMovedCount = 3,
}: {
  open: boolean
  onClose: () => void
  role?: ProPersonaRole
  plazosSoonCount?: number
  clientsMovedCount?: number
}) {
  const titleId = useId()
  const [q, setQ] = useState('')
  const clients = useMemo(() => {
    if (role !== 'pasante') return PRO_DEMO_CLIENTS
    // Demo: pasante only assigned to Fondo Pedregal matters.
    return PRO_DEMO_CLIENTS.map((c) =>
      c.id === 'fondo'
        ? c
        : { ...c, allowedMatterIds: [] as string[] }
    )
  }, [role])

  const chips = useMemo(
    () => buildProSuggestions({ plazosSoonCount, clientsMovedCount }),
    [plazosSoonCount, clientsMovedCount]
  )

  const intent = useMemo(
    () => parseProIntent(q, { role, clients }),
    [q, role, clients]
  )
  const draft = useMemo(() => buildProDraft(intent), [intent])

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="cic-pro-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="cic-pro-panel">
        <div className="cic-pro-head">
          <div>
            <p className="cic-pro-badge">{copy.pro.badge}</p>
            <h2 id={titleId} className="cic-pro-title">
              {copy.pro.title}
            </h2>
            <p className="cic-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              {copy.pro.lead}
            </p>
          </div>
          <button type="button" className="cic-linkish" onClick={onClose}>
            {copy.components.close}
          </button>
        </div>

        <label className="cic-pro-label" htmlFor="cic-pro-input">
          {copy.pro.inputLabel}
        </label>
        <input
          id="cic-pro-input"
          className="cic-pro-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.pro.placeholder}
          autoFocus
        />

        <div className="cic-pro-chips" aria-label={copy.pro.suggestionsLabel}>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cic-pro-chip"
              onClick={() => setQ(c.query)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {draft ? (
          <div className={`cic-pro-draft${draft.denied ? ' is-denied' : ''}`}>
            <p className="cic-pro-draft-kicker">{copy.pro.draftLabel}</p>
            {draft.denied ? (
              <p className="cic-muted cic-inline-denied" role="note">
                {draft.denyReason}
              </p>
            ) : (
              <>
                <p>
                  <strong>{copy.pro.toLabel}:</strong> {draft.toName}
                </p>
                <p>
                  <strong>{copy.pro.subjectLabel}:</strong> {draft.subject}
                </p>
                <pre className="cic-pro-draft-body">{draft.body}</pre>
                <p className="cic-muted" style={{ fontSize: '0.8rem' }}>
                  {copy.pro.neverSends}
                </p>
                <p style={{ marginTop: 12 }}>
                  <Link className="cic-btn" href={draft.href} onClick={onClose}>
                    {copy.pro.openCompose}
                  </Link>
                </p>
              </>
            )}
          </div>
        ) : q.trim() ? (
          <p className="cic-muted" role="status">
            {copy.pro.unknown}
          </p>
        ) : null}
      </div>
    </div>
  )
}
