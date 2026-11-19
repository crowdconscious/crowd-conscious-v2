'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { guidedStoryAction } from '../actions'
import {
  GUIDED_STORY_TOTAL,
  guidedStepHref,
  type GuidedStoryState,
} from '@/lib/ciceron/demo/guided-story-pure'

function stepMeta(step: number): { title: string; body: string; cta: string; href: string } {
  const key = Math.min(Math.max(step, 1), 5) as 1 | 2 | 3 | 4 | 5
  const s = copy.guidedStory.steps[key]
  return { ...s, href: guidedStepHref(key) }
}

/**
 * Compact docked panel — lives outside the room content column so it neither
 * pushes the board nor covers the main surface (fixed corner).
 */
export function GuidedStoryPanel({
  state,
}: {
  state: GuidedStoryState
  /** @deprecated Kept for call-site compat; dock is always compact. */
  compact?: boolean
}) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = panelRef.current
    if (!root) return
    function onKey(e: KeyboardEvent) {
      if (!root) return
      if (e.key === 'Escape') {
        const dismiss = root.querySelector<HTMLButtonElement>('button[data-guided-dismiss]')
        dismiss?.click()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [])

  if (state.dismissed) return null

  const isFinale = state.currentStep >= 6 || state.completed
  const current = isFinale ? null : stepMeta(state.currentStep)
  const nextStep = isFinale ? 6 : Math.min(state.currentStep + 1, 6)

  return (
    <aside
      ref={panelRef}
      className="cic-guided cic-guided-dock"
      aria-labelledby="cic-guided-title"
      tabIndex={-1}
    >
      <div className="cic-guided-head">
        <div>
          <p className="cic-guided-demo-tag">{copy.guidedStory.demoTag}</p>
          <h2 id="cic-guided-title" className="cic-guided-title">
            {copy.guidedStory.title}
            {!isFinale ? (
              <span className="cic-muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: '0.8rem' }}>
                {copy.guidedStory.progress}{' '}
                {Math.min(state.currentStep, GUIDED_STORY_TOTAL)}{' '}
                {copy.guidedStory.of} {GUIDED_STORY_TOTAL}
              </span>
            ) : null}
          </h2>
        </div>
        <form action={guidedStoryAction}>
          <input type="hidden" name="dismiss" value="1" />
          <input type="hidden" name="step" value="1" />
          <button
            type="submit"
            className="cic-linkish"
            data-guided-dismiss=""
            aria-label={copy.guidedStory.dismiss}
          >
            {copy.guidedStory.dismiss}
          </button>
        </form>
      </div>

      {isFinale ? (
        <div className="cic-guided-finale">
          <p style={{ margin: '6px 0' }}>
            <strong>{copy.guidedStory.finale.title}.</strong> {copy.guidedStory.finale.body}
          </p>
          <div className="cic-guided-actions">
            <form action={guidedStoryAction}>
              <input type="hidden" name="resume" value="1" />
              <input type="hidden" name="step" value="1" />
              <input type="hidden" name="href" value="/ciceron/hoy" />
              <button type="submit" className="cic-btn cic-btn-ghost">
                {copy.guidedStory.resume}
              </button>
            </form>
            <a className="cic-btn" href={copy.guidedStory.finale.ctaHref}>
              {copy.guidedStory.finale.cta}
            </a>
          </div>
        </div>
      ) : current ? (
        <div className="cic-guided-slim-body">
          <p className="cic-guided-story-client">{copy.guidedStory.storyClient}</p>
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.35 }}>
            <strong>{current.title}.</strong> {current.body}
          </p>
          <div className="cic-guided-actions">
            <form action={guidedStoryAction}>
              <input type="hidden" name="step" value={String(nextStep)} />
              <input
                type="hidden"
                name="href"
                value={guidedStepHref(nextStep <= 5 ? (nextStep as 1) : 6)}
              />
              <button type="submit" className="cic-btn">
                {copy.guidedStory.next}
              </button>
            </form>
            <Link className="cic-btn cic-btn-ghost" href={current.href}>
              {current.cta}
            </Link>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

export function GuidedStoryStartButton() {
  return (
    <form action={guidedStoryAction} className="cic-guided-start-form">
      <input type="hidden" name="resume" value="1" />
      <input type="hidden" name="step" value="1" />
      <input type="hidden" name="href" value="/ciceron/boletines" />
      <button type="submit" className="cic-guided-start-btn">
        {copy.guidedStory.start}
      </button>
    </form>
  )
}

export function GuidedStoryResumeBar({
  dismissed,
  completed = false,
  onResumeHref = '/ciceron/boletines',
}: {
  dismissed: boolean
  /** Finished tours also need a visible resume path. */
  completed?: boolean
  onResumeHref?: string
}) {
  if (!dismissed && !completed) return null
  return (
    <div className="cic-guided-resume" role="status">
      <form action={guidedStoryAction}>
        <input type="hidden" name="resume" value="1" />
        <input type="hidden" name="step" value="1" />
        <input type="hidden" name="href" value={onResumeHref} />
        <button type="submit" className="cic-linkish">
          {copy.guidedStory.start}
        </button>
      </form>
    </div>
  )
}
