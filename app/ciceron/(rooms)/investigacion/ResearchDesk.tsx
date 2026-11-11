'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { EvidencePanel } from '../../_components/EvidencePanel'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  askResearch,
  saveResearchFeedback,
  sendResearchToReview,
  type AskResearchState,
} from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="cic-btn" disabled={pending}>
      {pending ? copy.investigacion.generating : copy.investigacion.submit}
    </button>
  )
}

function StreamingHint({ onPending }: { onPending: (p: boolean) => void }) {
  const { pending } = useFormStatus()
  useEffect(() => {
    onPending(pending)
  }, [pending, onPending])
  return null
}

const initial: AskResearchState = { ok: false }

export function ResearchDesk({
  coverage,
  matters,
  history,
}: {
  coverage: string
  matters: Array<{ id: string; title: string }>
  history: Array<{ id: string; question: string; created_at: string }>
}) {
  const [state, formAction] = useActionState(askResearch, initial)
  const [scope, setScope] = useState('dof')
  const [matterId, setMatterId] = useState('')
  const [asOf, setAsOf] = useState('')
  const [streamHint, setStreamHint] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('')

  useEffect(() => {
    if (state.ok) setStreamHint(false)
  }, [state.ok])

  const evidence =
    state.ok && state.sources
      ? state.sources.map((s) => ({
          id: s.chunkId,
          authority: s.authority || 'DOF',
          type: 'Pasaje',
          date: s.noteDate || '—',
          href: s.officialUrl || 'https://www.dof.gob.mx/',
          passage: s.passage,
        }))
      : []

  const filteredHistory = history.filter((h) =>
    h.question.toLowerCase().includes(historyFilter.toLowerCase())
  )

  function copyAnswer() {
    if (!state.body) return
    void navigator.clipboard.writeText(state.body)
  }

  return (
    <div>
      <p className="cic-muted" style={{ marginTop: 12, fontSize: '0.85rem' }}>
        {coverage}
      </p>

      <form action={formAction} className="cic-section">
        <StreamingHint onPending={setStreamHint} />
        <label htmlFor="cic-research-q" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {copy.investigacion.ask}
        </label>
        <textarea
          id="cic-research-q"
          name="question"
          className="cic-input"
          required
          rows={3}
          style={{ marginTop: 8, resize: 'vertical' }}
          placeholder={copy.investigacion.askPlaceholder}
        />

        <div
          style={{
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            marginTop: 12,
          }}
        >
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.investigacion.scope}
            </span>
            <select
              className="cic-input"
              style={{ marginTop: 4 }}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              name="scope"
            >
              <option value="dof">{copy.investigacion.scopeDof}</option>
              <option value="legislation" disabled>
                {copy.investigacion.scopeLegislation}
              </option>
              <option value="theses" disabled>
                {copy.investigacion.scopeTheses}
              </option>
              <option value="firm" disabled>
                {copy.investigacion.scopeFirm}
              </option>
            </select>
          </label>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.investigacion.matter}
            </span>
            <select
              className="cic-input"
              style={{ marginTop: 4 }}
              name="matterId"
              value={matterId}
              onChange={(e) => setMatterId(e.target.value)}
            >
              <option value="">{copy.investigacion.matterNone}</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
              {copy.investigacion.asOf}
            </span>
            <input
              type="date"
              name="asOfDate"
              className="cic-input"
              style={{ marginTop: 4 }}
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <SubmitButton />
        </div>
        {streamHint && !state.ok && (
          <p className="cic-muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
            {copy.investigacion.streaming}
          </p>
        )}
        {!state.ok && state.message && (
          <p role="alert" className="cic-error" style={{ marginTop: 8 }}>
            {state.message}
          </p>
        )}
      </form>

      <section
        className="cic-section"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0,1fr) minmax(240px,320px)',
        }}
      >
        <article className="cic-card" aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <h2 className="cic-h2" style={{ fontSize: '1.05rem', margin: 0 }}>
              {copy.investigacion.answerTitle}
            </h2>
            {state.ok && (
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.investigacion.draftBadge}
              </span>
            )}
          </div>
          {state.ok && state.body ? (
            <>
              {state.degraded && state.degradeReason && (
                <p role="status" className="cic-muted" style={{ fontSize: '0.85rem' }}>
                  {state.degradeReason}
                </p>
              )}
              <div className="cic-legal" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
                {state.body}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                <button type="button" className="cic-btn" style={{ fontSize: '0.85rem' }} onClick={copyAnswer}>
                  {copy.investigacion.copy}
                </button>
                {state.researchQueryId && (
                  <form action={saveResearchFeedback} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input type="hidden" name="researchQueryId" value={state.researchQueryId} />
                    <button type="submit" name="feedback" value="useful" className="cic-btn" style={{ fontSize: '0.8rem' }}>
                      {copy.investigacion.feedbackUseful}
                    </button>
                    <button type="submit" name="feedback" value="incorrect" className="cic-btn cic-btn-secondary" style={{ fontSize: '0.8rem' }}>
                      {copy.investigacion.feedbackIncorrect}
                    </button>
                    <button type="submit" name="feedback" value="incomplete" className="cic-btn cic-btn-secondary" style={{ fontSize: '0.8rem' }}>
                      {copy.investigacion.feedbackIncomplete}
                    </button>
                    <input
                      name="comment"
                      className="cic-input"
                      placeholder={copy.investigacion.feedbackComment}
                      style={{ minWidth: 160, fontSize: '0.85rem' }}
                    />
                  </form>
                )}
                {state.aiOutputId && matterId && (
                  <form action={sendResearchToReview}>
                    <input type="hidden" name="aiOutputId" value={state.aiOutputId} />
                    <input type="hidden" name="matterId" value={matterId} />
                    <button type="submit" className="cic-btn" style={{ fontSize: '0.85rem' }}>
                      {copy.investigacion.sendReview}
                    </button>
                  </form>
                )}
              </div>
              {state.searchedQueries && state.searchedQueries.length > 0 && (
                <p className="cic-muted" style={{ marginTop: 12, fontSize: '0.8rem' }}>
                  {copy.investigacion.searched}: {state.searchedQueries.join(' · ')}
                </p>
              )}
            </>
          ) : (
            <p className="cic-muted" style={{ marginTop: 12 }}>
              {copy.investigacion.emptyAnswer}
            </p>
          )}
        </article>
        <EvidencePanel items={evidence} />
      </section>

      <section className="cic-section">
        <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
          {copy.investigacion.history}
        </h2>
        <input
          className="cic-input"
          style={{ marginTop: 8, maxWidth: 360 }}
          placeholder={copy.investigacion.historySearch}
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value)}
        />
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
          {filteredHistory.length === 0 ? (
            <li className="cic-muted">{copy.investigacion.historyEmpty}</li>
          ) : (
            filteredHistory.map((h) => (
              <li
                key={h.id}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid var(--cic-rule)',
                  fontSize: '0.9rem',
                }}
              >
                <span className="cic-muted" style={{ fontSize: '0.75rem', marginRight: 8 }}>
                  {new Date(h.created_at).toLocaleString('es-MX')}
                </span>
                {h.question}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
