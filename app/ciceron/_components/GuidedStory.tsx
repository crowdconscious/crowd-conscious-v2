'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { guidedStoryAction } from '../actions'
import {
  GUIDED_STORY_TOTAL,
  guidedStepHref,
  type GuidedStoryState,
} from '@/lib/ciceron/demo/guided-story-pure'

/** Client persistence so dismiss/step survive rooms without auto-opening everywhere. */
export const GUIDED_TOUR_STORAGE_KEY = 'ciceron-guided-tour-v1'

export type GuidedTourStorage = {
  dismissed: boolean
  completed: boolean
  currentStep: number
  /** User opened or resumed the tour (keep visible across rooms until dismiss). */
  active: boolean
  /** Auto-open on Hoy already happened once. */
  hoyAutoOpened: boolean
}

function readTourStorage(): GuidedTourStorage | null {
  try {
    const raw = window.localStorage.getItem(GUIDED_TOUR_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<GuidedTourStorage>
    return {
      dismissed: Boolean(parsed.dismissed),
      completed: Boolean(parsed.completed),
      currentStep: Number(parsed.currentStep) || 1,
      active: Boolean(parsed.active),
      hoyAutoOpened: Boolean(parsed.hoyAutoOpened),
    }
  } catch {
    return null
  }
}

function writeTourStorage(next: GuidedTourStorage): void {
  try {
    window.localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function stepMeta(step: number): { title: string; body: string; cta: string; href: string } {
  const key = Math.min(Math.max(step, 1), 5) as 1 | 2 | 3 | 4 | 5
  const s = copy.guidedStory.steps[key]
  return { ...s, href: guidedStepHref(key) }
}

/**
 * Compact docked panel — desktop corner; mobile bottom sheet above the nav.
 * Auto-opens only on first visit to Hoy; otherwise requires resume/start.
 */
export function GuidedStoryPanel({
  state,
}: {
  state: GuidedStoryState
  /** @deprecated Kept for call-site compat; dock is always compact. */
  compact?: boolean
}) {
  const pathname = usePathname()
  const panelRef = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [localDismissed, setLocalDismissed] = useState(false)

  useEffect(() => {
    const stored = readTourStorage()
    const onHoy = pathname === '/ciceron/hoy' || pathname?.startsWith('/ciceron/hoy/')

    if (state.dismissed || stored?.dismissed) {
      setLocalDismissed(true)
      setVisible(false)
      setReady(true)
      if (!stored?.dismissed) {
        writeTourStorage({
          dismissed: true,
          completed: Boolean(state.completed || stored?.completed),
          currentStep: state.currentStep,
          active: false,
          hoyAutoOpened: true,
        })
      }
      return
    }

    if (stored?.active) {
      setVisible(true)
      setReady(true)
      return
    }

    if (onHoy && !stored?.hoyAutoOpened) {
      writeTourStorage({
        dismissed: false,
        completed: Boolean(state.completed),
        currentStep: state.currentStep,
        active: true,
        hoyAutoOpened: true,
      })
      setVisible(true)
      setReady(true)
      return
    }

    setVisible(false)
    setReady(true)
  }, [pathname, state.completed, state.currentStep, state.dismissed])

  useEffect(() => {
    const root = panelRef.current
    if (!root || !visible || collapsed) return
    function onKey(e: KeyboardEvent) {
      if (!root) return
      if (e.key === 'Escape') {
        const dismiss = root.querySelector<HTMLButtonElement>('button[data-guided-dismiss]')
        dismiss?.click()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [visible, collapsed])

  if (!ready || localDismissed || state.dismissed || !visible) return null

  const isFinale = state.currentStep >= 6 || state.completed
  const current = isFinale ? null : stepMeta(state.currentStep)
  const nextStep = isFinale ? 6 : Math.min(state.currentStep + 1, 6)

  if (collapsed) {
    return (
      <button
        type="button"
        className="cic-guided-pill"
        aria-expanded={false}
        onClick={() => setCollapsed(false)}
      >
        {copy.guidedStory.title}
        {!isFinale ? (
          <span className="cic-guided-pill-step">
            {Math.min(state.currentStep, GUIDED_STORY_TOTAL)}/{GUIDED_STORY_TOTAL}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <aside
      ref={panelRef}
      className="cic-guided cic-guided-dock cic-guided-sheet"
      aria-labelledby="cic-guided-title"
      tabIndex={-1}
    >
      <div className="cic-guided-sheet-handle" aria-hidden="true" />
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
        <div className="cic-guided-head-actions">
          <button
            type="button"
            className="cic-linkish cic-guided-collapse"
            onClick={() => setCollapsed(true)}
            aria-label={copy.guidedStory.collapse}
          >
            {copy.guidedStory.collapse}
          </button>
          <form
            action={guidedStoryAction}
            onSubmit={() => {
              writeTourStorage({
                dismissed: true,
                completed: Boolean(state.completed),
                currentStep: state.currentStep,
                active: false,
                hoyAutoOpened: true,
              })
              setLocalDismissed(true)
              setVisible(false)
            }}
          >
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
      </div>

      {isFinale ? (
        <div className="cic-guided-finale">
          <p style={{ margin: '6px 0' }}>
            <strong>{copy.guidedStory.finale.title}.</strong> {copy.guidedStory.finale.body}
          </p>
          <div className="cic-guided-actions">
            <form
              action={guidedStoryAction}
              onSubmit={() => {
                writeTourStorage({
                  dismissed: false,
                  completed: false,
                  currentStep: 1,
                  active: true,
                  hoyAutoOpened: true,
                })
              }}
            >
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
            <form
              action={guidedStoryAction}
              onSubmit={() => {
                writeTourStorage({
                  dismissed: false,
                  completed: nextStep >= 6,
                  currentStep: nextStep,
                  active: true,
                  hoyAutoOpened: true,
                })
              }}
            >
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

function markTourResumed(): void {
  writeTourStorage({
    dismissed: false,
    completed: false,
    currentStep: 1,
    active: true,
    hoyAutoOpened: true,
  })
}

export function GuidedStoryStartButton() {
  return (
    <form action={guidedStoryAction} className="cic-guided-start-form" onSubmit={markTourResumed}>
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
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = readTourStorage()
    setShow(Boolean(dismissed || completed || stored?.dismissed || stored?.completed))
  }, [dismissed, completed])

  if (!show) return null
  return (
    <div className="cic-guided-resume" role="status">
      <form action={guidedStoryAction} onSubmit={markTourResumed}>
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
