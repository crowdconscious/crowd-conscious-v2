'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { ConfirmDialog } from '../../../_components/ConfirmDialog'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import {
  decideReviewAction,
  reassignReviewAction,
  saveReviewEditAction,
} from '@/lib/ciceron/review/actions'
import { diffLines } from '@/lib/ciceron/review/diff'
import type { ReviewTaskDetail } from '@/lib/ciceron/review/types'

const REASSIGN_OPTIONS = [
  { id: CICERON_SEED.personas.socio, label: 'Socia Demo Rivera' },
  { id: CICERON_SEED.personas.asociado, label: 'Asociado Demo Herrera' },
  { id: CICERON_SEED.personas.asociado2, label: 'Asociada Demo Méndez' },
]

export function ReviewWorkspace({
  detail,
  neighborIds,
}: {
  detail: ReviewTaskDetail
  neighborIds: { prev: string | null; next: string | null }
}) {
  const router = useRouter()
  const [body, setBody] = useState(detail.currentBody)
  const [editing, setEditing] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [reassignTo, setReassignTo] = useState<string>(CICERON_SEED.personas.asociado)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const diffs = showDiff ? diffLines(detail.modelBody, body) : []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return
      if (e.key === 'j' || e.key === 'J') {
        if (neighborIds.next) router.push(`${CICERON_BASE}/revision/${neighborIds.next}`)
      } else if (e.key === 'k' || e.key === 'K') {
        if (neighborIds.prev) router.push(`${CICERON_BASE}/revision/${neighborIds.prev}`)
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        onApprove()
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        setEditing(true)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        setRejectOpen(true)
      } else if (e.key === 'o' || e.key === 'O') {
        const href = detail.evidence[0]?.href
        if (href) window.open(href, '_blank', 'noopener,noreferrer')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional keyboard bindings
  }, [neighborIds, detail.evidence, body, editing])

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) setError(result.message ?? copy.components.error)
      else {
        setMessage(result.message ?? 'Listo.')
        setEditing(false)
        router.refresh()
      }
    })
  }

  function onApprove() {
    if (editing && body !== detail.currentBody) {
      run(() =>
        decideReviewAction({
          taskId: detail.id,
          decision: 'corrected',
          editedBody: body,
        })
      )
      return
    }
    run(() =>
      decideReviewAction({
        taskId: detail.id,
        decision: 'approved',
      })
    )
  }

  function onSaveEdit() {
    run(() => saveReviewEditAction({ taskId: detail.id, editedBody: body }))
  }

  function onReject() {
    run(async () => {
      const result = await decideReviewAction({
        taskId: detail.id,
        decision: 'rejected',
        notes: rejectReason,
      })
      if (result.ok) setRejectOpen(false)
      return result
    })
  }

  function onReassign() {
    run(async () => {
      const result = await reassignReviewAction({
        taskId: detail.id,
        newAssigneeId: reassignTo,
      })
      if (result.ok) setReassignOpen(false)
      return result
    })
  }

  return (
    <div className="cic-review-workspace">
      <div className="cic-review-toolbar">
        <div className="cic-review-nav">
          {neighborIds.prev ? (
            <Link
              className="cic-btn cic-btn-secondary"
              href={`${CICERON_BASE}/revision/${neighborIds.prev}`}
            >
              Anterior
            </Link>
          ) : (
            <span className="cic-btn cic-btn-secondary" aria-disabled="true">
              Anterior
            </span>
          )}
          {neighborIds.next ? (
            <Link
              className="cic-btn cic-btn-secondary"
              href={`${CICERON_BASE}/revision/${neighborIds.next}`}
            >
              Siguiente
            </Link>
          ) : (
            <span className="cic-btn cic-btn-secondary" aria-disabled="true">
              Siguiente
            </span>
          )}
        </div>
        <p className="cic-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
          {copy.revision.keyboardHint}
        </p>
      </div>

      {detail.fourEyesOn ? (
        <p className="cic-callout" role="note">
          {copy.revision.fourEyesNote}
        </p>
      ) : null}

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

      <div className="cic-review-split">
        <section className="cic-review-draft" aria-label={copy.revision.draftPane}>
          <div className="cic-review-pane-head">
            <h2 className="cic-h2" style={{ fontSize: '1rem', margin: 0 }}>
              {copy.revision.draftPane}
            </h2>
            <button
              type="button"
              className="cic-btn cic-btn-secondary"
              onClick={() => setShowDiff((v) => !v)}
            >
              {showDiff ? copy.revision.hideDiff : copy.revision.diff}
            </button>
          </div>

          {showDiff ? (
            <pre className="cic-diff" aria-label={copy.revision.diff}>
              {diffs.map((line, i) => (
                <div
                  key={`${line.kind}-${i}`}
                  className={
                    line.kind === 'add'
                      ? 'cic-diff-add'
                      : line.kind === 'remove'
                        ? 'cic-diff-remove'
                        : 'cic-diff-same'
                  }
                >
                  <span className="cic-diff-mark" aria-hidden="true">
                    {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
                  </span>
                  {line.text}
                </div>
              ))}
            </pre>
          ) : editing ? (
            <textarea
              className="cic-textarea cic-review-editor"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              aria-label={copy.revision.draftPane}
            />
          ) : (
            <article className="cic-legal cic-review-body">{body}</article>
          )}

          <div className="cic-review-actions">
            <button
              type="button"
              className="cic-btn"
              disabled={pending || detail.closed}
              onClick={onApprove}
            >
              {editing && body !== detail.modelBody
                ? copy.revision.approveEdits
                : copy.revision.approve}
            </button>
            <button
              type="button"
              className="cic-btn cic-btn-secondary"
              disabled={pending || detail.closed}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? copy.components.cancel : 'Editar'}
            </button>
            {editing ? (
              <button
                type="button"
                className="cic-btn cic-btn-secondary"
                disabled={pending}
                onClick={onSaveEdit}
              >
                {copy.revision.saveEdit}
              </button>
            ) : null}
            <button
              type="button"
              className="cic-btn cic-btn-secondary"
              disabled={pending || detail.closed}
              onClick={() => setRejectOpen(true)}
            >
              {copy.revision.reject}
            </button>
            <button
              type="button"
              className="cic-btn cic-btn-secondary"
              disabled={pending || detail.closed}
              onClick={() => setReassignOpen(true)}
            >
              {copy.revision.reassign}
            </button>
            <Link
              className="cic-btn cic-btn-secondary"
              href={`${CICERON_BASE}/revision/${detail.id}/entregar`}
            >
              {copy.revision.deliveryCta}
            </Link>
          </div>
        </section>

        <aside className="cic-review-evidence" aria-label={copy.revision.evidencePane}>
          <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
            {copy.revision.evidencePane}
          </h2>

          <div className="cic-stack">
            <div>
              <h3 className="cic-label">{copy.revision.clientContext}</h3>
              <p className="cic-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                {detail.clientContext}
              </p>
            </div>

            {detail.aiRun ? (
              <div>
                <h3 className="cic-label">{copy.revision.modelMeta}</h3>
                <p className="cic-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {detail.aiRun.model} · {detail.aiRun.promptVersion}
                  <br />
                  {detail.aiRun.purpose}
                </p>
              </div>
            ) : null}

            {detail.evidence.map((ev) => (
              <div key={ev.id} className="cic-evidence-card">
                <div className="cic-evidence-title">{ev.title || ev.authority}</div>
                <div className="cic-evidence-sub">{ev.authority}</div>
                <p className="cic-legal cic-evidence-excerpt">
                  <mark>{ev.passage}</mark>
                </p>
                <p className="cic-muted" style={{ fontSize: '0.8rem', margin: '8px 0 0' }}>
                  {copy.revision.matchReason}: {ev.matchReason}
                </p>
                {ev.href ? (
                  <a
                    className="cic-source"
                    href={ev.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.components.openSource}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={rejectOpen}
        title={copy.revision.reject}
        onCancel={() => setRejectOpen(false)}
        onConfirm={onReject}
      >
        <label className="cic-label" htmlFor="reject-reason">
          {copy.revision.rejectReason}
        </label>
        <textarea
          id="reject-reason"
          className="cic-textarea"
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={reassignOpen}
        title={copy.revision.reassign}
        onCancel={() => setReassignOpen(false)}
        onConfirm={onReassign}
      >
        <label className="cic-label" htmlFor="reassign-to">
          {copy.revision.reassignTo}
        </label>
        <select
          id="reassign-to"
          className="cic-select"
          value={reassignTo}
          onChange={(e) => setReassignTo(e.target.value)}
        >
          {REASSIGN_OPTIONS.filter((o) => o.id !== detail.assigneeId).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </ConfirmDialog>
    </div>
  )
}
