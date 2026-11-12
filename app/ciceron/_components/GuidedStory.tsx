'use client'

import Link from 'next/link'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { guidedStoryAction } from '../actions'
import {
  guidedStepHref,
  type GuidedStoryState,
} from '@/lib/ciceron/demo/guided-story-pure'

function stepMeta(step: number): { title: string; body: string; cta: string; href: string } {
  const key = Math.min(Math.max(step, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6
  const s = copy.guidedStory.steps[key]
  return { ...s, href: guidedStepHref(key) }
}

export function GuidedStoryPanel({ state }: { state: GuidedStoryState }) {
  if (state.dismissed) return null

  const isFinale = state.currentStep >= 7 || state.completed
  const current = isFinale ? null : stepMeta(state.currentStep)
  const nextStep = isFinale ? 7 : Math.min(state.currentStep + 1, 7)

  return (
    <aside className="cic-guided" aria-labelledby="cic-guided-title">
      <div className="cic-guided-head">
        <h2 id="cic-guided-title" className="cic-guided-title">
          {copy.guidedStory.title}
        </h2>
        {!isFinale ? (
          <p className="cic-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {copy.guidedStory.progress} {Math.min(state.currentStep, 6)} {copy.guidedStory.of}{' '}
            6
          </p>
        ) : null}
      </div>

      {isFinale ? (
        <div className="cic-guided-finale">
          <h3 className="cic-h2" style={{ fontSize: '1.05rem', marginTop: 8 }}>
            {copy.guidedStory.finale.title}
          </h3>
          <p className="cic-lead" style={{ marginTop: 4, fontSize: '0.95rem' }}>
            {copy.guidedStory.finale.body}
          </p>
          <p>
            <strong>{copy.guidedStory.finale.realLabel}:</strong>{' '}
            {copy.guidedStory.finale.realItems}
          </p>
          <p>
            <strong>{copy.guidedStory.finale.sampleLabel}:</strong>{' '}
            {copy.guidedStory.finale.sampleItems}
          </p>
          <a className="cic-btn" href={copy.guidedStory.finale.ctaHref}>
            {copy.guidedStory.finale.cta}
          </a>
        </div>
      ) : current ? (
        <>
          <h3 className="cic-h2" style={{ fontSize: '1.05rem', marginTop: 8 }}>
            {current.title}
          </h3>
          <p className="cic-lead" style={{ marginTop: 4, fontSize: '0.95rem' }}>
            {current.body}
          </p>
          <div className="cic-guided-actions">
            <form action={guidedStoryAction}>
              <input type="hidden" name="step" value={String(nextStep)} />
              <input
                type="hidden"
                name="href"
                value={guidedStepHref(nextStep <= 6 ? (nextStep as 1) : 7)}
              />
              <button type="submit" className="cic-btn">
                {copy.guidedStory.next}
              </button>
            </form>
            <Link className="cic-btn cic-btn-ghost" href={current.href}>
              {current.cta}
            </Link>
          </div>
        </>
      ) : null}

      <form action={guidedStoryAction} style={{ marginTop: 12 }}>
        <input type="hidden" name="dismiss" value="1" />
        <input type="hidden" name="step" value="1" />
        <button type="submit" className="cic-linkish">
          {copy.guidedStory.dismiss}
        </button>
      </form>
    </aside>
  )
}
