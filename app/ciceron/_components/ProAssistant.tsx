'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  PRO_DEMO_CLIENTS,
  buildProDraft,
  buildProSuggestions,
  parseProIntent,
  type ProClientRef,
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
  clients: clientsProp,
}: {
  open: boolean
  onClose: () => void
  role?: ProPersonaRole
  plazosSoonCount?: number
  clientsMovedCount?: number
  clients?: ProClientRef[]
}) {
  const titleId = useId()
  const [q, setQ] = useState('')
  const [preferredEntryId, setPreferredEntryId] = useState<string | undefined>()

  const baseClients = clientsProp ?? PRO_DEMO_CLIENTS
  const clients = useMemo(() => {
    if (role !== 'pasante') return baseClients
    return baseClients.map((c) =>
      c.id === 'fondo' ? c : { ...c, allowedMatterIds: [] as string[] }
    )
  }, [role, baseClients])

  const chips = useMemo(
    () =>
      buildProSuggestions({
        plazosSoonCount,
        clientsMovedCount,
        primaryClientName: clients[0]?.name,
      }),
    [plazosSoonCount, clientsMovedCount, clients]
  )

  const intent = useMemo(
    () => parseProIntent(q, { role, clients, preferredEntryId }),
    [q, role, clients, preferredEntryId]
  )
  const draft = useMemo(() => buildProDraft(intent), [intent])

  useEffect(() => {
    if (!open) {
      setQ('')
      setPreferredEntryId(undefined)
    }
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
          onChange={(e) => {
            setPreferredEntryId(undefined)
            setQ(e.target.value)
          }}
          placeholder={copy.pro.placeholder}
          autoFocus
        />

        <div className="cic-pro-chips" aria-label={copy.pro.suggestionsLabel}>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cic-pro-chip"
              onClick={() => {
                setPreferredEntryId(undefined)
                setQ(c.query)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {draft ? (
          <div className={`cic-pro-draft${draft.denied ? ' is-denied' : ''}`}>
            <p className="cic-pro-draft-kicker">{copy.pro.draftLabel}</p>
            {!draft.denied ? (
              <div className="cic-pro-resolution" aria-label={copy.pro.resolvedLabel}>
                <span className="cic-pro-res-chip">
                  <span className="cic-pro-res-k">{copy.pro.chipClient}</span>
                  {draft.resolution.clientName}
                </span>
                <span className="cic-pro-res-chip">
                  <span className="cic-pro-res-k">{copy.pro.chipMatter}</span>
                  {(() => {
                    const matter = draft.resolution.matterLabel
                    const exp = draft.resolution.expedienteNumber
                    if (!exp || exp === '—') return matter
                    // Avoid «Expediente 512/2026 · 512/2026».
                    if (matter.includes(exp)) return matter
                    return `${matter} · ${exp}`
                  })()}
                </span>
                <span className="cic-pro-res-chip">
                  <span className="cic-pro-res-k">{copy.pro.chipSource}</span>
                  {draft.resolution.sourceName}
                </span>
              </div>
            ) : null}
            {draft.alternateMatters.length > 0 ? (
              <p className="cic-pro-alt-matters">
                <span className="cic-muted">{copy.pro.changeMatter}: </span>
                {draft.alternateMatters.map((m) => (
                  <button
                    key={m.entryId}
                    type="button"
                    className="cic-pro-alt-btn"
                    onClick={() => setPreferredEntryId(m.entryId)}
                  >
                    {m.label}
                  </button>
                ))}
              </p>
            ) : null}
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
