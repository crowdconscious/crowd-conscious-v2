'use client'

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { EvidencePanel } from '../../_components/EvidencePanel'
import { ResearchAnswerView } from '../../_components/ResearchAnswerView'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  buildCitationIndex,
  formatAnswerForCopy,
  orderSourcesByCitations,
  type AnswerSource,
} from '@/lib/ciceron/research/format-answer'
import {
  askResearch,
  loadPastResearchAnswer,
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
  const [past, setPast] = useState<AskResearchState | null>(null)
  const [scope, setScope] = useState('dof')
  const [matterId, setMatterId] = useState('')
  const [asOf, setAsOf] = useState('')
  const [streamHint, setStreamHint] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('')
  const [activeCite, setActiveCite] = useState<number | null>(null)
  const [copyNote, setCopyNote] = useState(false)
  const [historyPending, startHistoryTransition] = useTransition()

  useEffect(() => {
    if (state.ok) {
      setStreamHint(false)
      setPast(null)
      setActiveCite(null)
    }
  }, [state.ok, state.researchQueryId])

  const active: AskResearchState = past?.ok ? past : state

  const sources: AnswerSource[] = useMemo(
    () =>
      (active.ok && active.sources
        ? active.sources
        : []
      ).map((s) => ({
        chunkId: s.chunkId,
        authority: s.authority,
        title: s.title,
        noteDate: s.noteDate,
        officialUrl: s.officialUrl,
        passage: s.passage,
      })),
    [active]
  )

  const citationIndex = useMemo(
    () => buildCitationIndex(active.body ?? '', sources),
    [active.body, sources]
  )

  const evidence = useMemo(() => {
    const ordered = orderSourcesByCitations(sources, citationIndex)
    if (ordered.length > 0) {
      return ordered.map((s) => ({
        id: s.chunkId,
        n: citationIndex.numberById.get(s.chunkId.toLowerCase()) ?? 0,
        authority: s.authority || 'DOF',
        type: 'Pasaje',
        date: s.noteDate || '—',
        href: s.officialUrl || 'https://www.dof.gob.mx/',
        passage: s.passage,
      }))
    }
    // Body still has cites but sources metadata missing (e.g. past load gap)
    return citationIndex.orderedIds.map((id) => ({
      id,
      n: citationIndex.numberById.get(id) ?? 0,
      authority: 'DOF',
      type: 'Pasaje',
      date: '—',
      href: 'https://www.dof.gob.mx/',
      passage: 'Pasaje citado en la respuesta (metadatos no disponibles en esta vista).',
    }))
  }, [sources, citationIndex])

  const filteredHistory = history.filter((h) =>
    h.question.toLowerCase().includes(historyFilter.toLowerCase())
  )

  function onCiteClick(n: number) {
    setActiveCite(n)
    const el = document.getElementById(`cic-evidence-${n}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  function copyAnswer() {
    if (!active.body) return
    const text = formatAnswerForCopy(active.body, sources, citationIndex)
    void navigator.clipboard.writeText(text).then(() => {
      setCopyNote(true)
      window.setTimeout(() => setCopyNote(false), 2000)
    })
  }

  function openPast(id: string) {
    startHistoryTransition(async () => {
      const loaded = await loadPastResearchAnswer(id)
      if (loaded.ok) {
        setPast(loaded)
        setActiveCite(null)
        document.getElementById('cic-answer-panel')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    })
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
          defaultValue=""
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
        {!state.ok && state.message && !past?.ok ? (
          <p role="alert" className="cic-error" style={{ marginTop: 8 }}>
            {state.message}
          </p>
        ) : null}
      </form>

      <section
        className="cic-section"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0,1fr) minmax(240px,320px)',
        }}
      >
        <article className="cic-card" aria-live="polite" id="cic-answer-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <h2 className="cic-h2" style={{ fontSize: '1.05rem', margin: 0 }}>
              {copy.investigacion.answerTitle}
            </h2>
            {active.ok && active.body ? (
              <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
                {copy.investigacion.draftBadge}
              </span>
            ) : null}
          </div>
          {active.ok && active.body ? (
            <>
              {active.degraded && active.degradeReason ? (
                <p role="status" className="cic-muted" style={{ fontSize: '0.85rem' }}>
                  {active.degradeReason}
                </p>
              ) : null}
              <ResearchAnswerView
                body={active.body}
                sources={sources}
                activeCite={activeCite}
                onCiteClick={onCiteClick}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                <button type="button" className="cic-btn" style={{ fontSize: '0.85rem' }} onClick={copyAnswer}>
                  {copy.investigacion.copy}
                </button>
                {active.researchQueryId ? (
                  <form action={saveResearchFeedback} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input type="hidden" name="researchQueryId" value={active.researchQueryId} />
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
                ) : null}
                {active.aiOutputId && matterId ? (
                  <form action={sendResearchToReview}>
                    <input type="hidden" name="aiOutputId" value={active.aiOutputId} />
                    <input type="hidden" name="matterId" value={matterId} />
                    <button type="submit" className="cic-btn" style={{ fontSize: '0.85rem' }}>
                      {copy.investigacion.sendReview}
                    </button>
                  </form>
                ) : null}
              </div>
              {copyNote ? (
                <p className="cic-muted" role="status" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                  {copy.investigacion.copied}
                </p>
              ) : null}
              {active.searchedQueries && active.searchedQueries.length > 0 ? (
                <p className="cic-muted" style={{ marginTop: 12, fontSize: '0.8rem' }}>
                  {copy.investigacion.searched}: {active.searchedQueries.join(' · ')}
                </p>
              ) : null}
            </>
          ) : (
            <p className="cic-muted" style={{ marginTop: 12 }}>
              {copy.investigacion.emptyAnswer}
            </p>
          )}
        </article>
        <EvidencePanel items={evidence} activeCite={activeCite} />
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
                  display: 'flex',
                  gap: 12,
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  <span className="cic-muted" style={{ fontSize: '0.75rem', marginRight: 8 }}>
                    {new Date(h.created_at).toLocaleString('es-MX')}
                  </span>
                  {h.question}
                </span>
                <button
                  type="button"
                  className="cic-btn cic-btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', flexShrink: 0 }}
                  disabled={historyPending}
                  onClick={() => openPast(h.id)}
                >
                  {copy.investigacion.historyOpen}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
