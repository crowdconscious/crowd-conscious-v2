'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import {
  buildMatchSentenceParts,
  pickMatchPrimaryAction,
} from '@/lib/ciceron/boletines/match-sentence-pure'
import { buildQueCambio } from '@/lib/ciceron/boletines/que-cambio-pure'
import { copy } from '@/lib/ciceron/copy/es-MX'

export type BulletinMatchCardProps = {
  id: string
  clientName: string | null
  clientSide: 'actor' | 'demandado' | null
  courtName: string | null
  summary: string | null
  publicationDateLabel: string | null
  expedienteNumber: string | null
  deadlineLabel: string | null
  matchKind: 'exact' | 'possible'
  caseFileId: string | null
  sourceUrl: string | null
  reason: string
}

const ACTION_LABEL: Record<'open' | 'capture' | 'review' | 'source', string> = {
  open: copy.boletines.openExpedienteBtn,
  capture: copy.boletines.captureAcuerdoBtn,
  review: copy.boletines.sendReviewBtn,
  source: copy.boletines.openSource,
}

export function BulletinMatchCard(props: BulletinMatchCardProps) {
  const menuId = useId()
  const detailId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const sideLabel =
    props.clientSide === 'actor'
      ? copy.boletines.clientSideActor
      : props.clientSide === 'demandado'
        ? copy.boletines.clientSideDemandado
        : null

  const parts = buildMatchSentenceParts({
    clientName: props.clientName,
    clientSideLabel: sideLabel,
    courtName: props.courtName,
    requirement: props.summary,
    publicationDateLabel: props.publicationDateLabel,
    expedienteNumber: props.expedienteNumber,
    deadlineLabel: props.deadlineLabel,
  })

  const cambio = buildQueCambio({
    clientName: props.clientName,
    summary: props.summary,
    matchKind: props.matchKind,
    courtName: props.courtName,
    expedienteNumber: props.expedienteNumber,
  })

  const { primary, secondary } = pickMatchPrimaryAction({
    caseFileId: props.caseFileId,
    sourceUrl: props.sourceUrl,
  })

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <article className="cic-match-card" aria-labelledby={`${props.id}-sentence`}>
      <div className="cic-match-card-top">
        <p id={`${props.id}-sentence`} className="cic-match-card-sentence">
          <strong>{parts.client}</strong>
          {parts.side ? (
            <span className="cic-muted">{` (${parts.side})`}</span>
          ) : null}
          {` en ${parts.court}: ${parts.requirement}`}
        </p>
        <span className="cic-match-card-kind">
          {props.matchKind === 'exact'
            ? copy.boletines.matchExact
            : copy.boletines.matchPossible}
        </span>
      </div>
      {parts.meta ? (
        <p className="cic-muted cic-match-card-meta">{parts.meta}</p>
      ) : null}

      <section className="cic-que-cambio" aria-label={copy.boletines.queCambioTitle}>
        <h3 className="cic-que-cambio-title">{copy.boletines.queCambioTitle}</h3>
        <p className="cic-que-cambio-before">{cambio.before}</p>
        <p className="cic-que-cambio-after">{cambio.after}</p>
        {props.sourceUrl ? (
          <p className="cic-que-cambio-source">
            <a
              className="cic-btn cic-btn-secondary cic-btn-compact"
              href={props.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.boletines.verFuenteOficial}
            </a>
          </p>
        ) : null}
        <details className="cic-que-cambio-legal">
          <summary>{copy.boletines.legalDetailSummary}</summary>
          <p id={detailId} className="cic-muted">
            {cambio.legalDetail}
          </p>
        </details>
      </section>

      <p className="cic-muted cic-match-card-reason">{props.reason}</p>
      <div className="cic-match-card-actions" ref={rootRef}>
        {primary.external ? (
          <a
            className="cic-btn cic-btn-compact"
            href={primary.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ACTION_LABEL[primary.id]}
          </a>
        ) : (
          <Link className="cic-btn cic-btn-compact" href={primary.href}>
            {ACTION_LABEL[primary.id]}
          </Link>
        )}
        {secondary.length > 0 ? (
          <div className="cic-match-overflow">
            <button
              type="button"
              className="cic-btn cic-btn-secondary cic-btn-compact"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
            >
              {copy.boletines.moreActions}
            </button>
            {open ? (
              <ul id={menuId} className="cic-match-overflow-menu" role="menu">
                {secondary.map((action) => (
                  <li key={action.id} role="none">
                    {action.external ? (
                      <a
                        role="menuitem"
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                      >
                        {ACTION_LABEL[action.id]}
                      </a>
                    ) : (
                      <Link
                        role="menuitem"
                        href={action.href}
                        onClick={() => setOpen(false)}
                      >
                        {ACTION_LABEL[action.id]}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
