'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  GUIDED_SETUP_STEPS,
  GUIDED_SETUP_STORAGE_KEY,
  nextSetupStep,
  parseGuidedSetupStorage,
  prevSetupStep,
  shouldShowGuidedSetup,
  type GuidedSetupStorage,
} from '@/lib/ciceron/demo/guided-setup-pure'

export type GuidedSetupSnapshot = {
  firmName: string
  clients: Array<{ id: string; name: string; industry: string }>
  states: Array<{ code: string; name: string; statusLabel: string }>
}

function writeStorage(next: GuidedSetupStorage) {
  try {
    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode */
  }
}

/**
 * Skippable 3-step setup for demo/new firms: despacho → clientes → estados.
 * Uses existing fixture snapshot only — no DB writes.
 */
export function GuidedFirmSetup({ snapshot }: { snapshot: GuidedSetupSnapshot }) {
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const stored = parseGuidedSetupStorage(
      window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY)
    )
    setVisible(shouldShowGuidedSetup(stored))
    setStepIndex(stored?.stepIndex ?? 0)
    setReady(true)
  }, [])

  if (!ready || !visible) return null

  const stepId = GUIDED_SETUP_STEPS[stepIndex]
  const stepCopy = copy.guidedSetup.steps[stepId]
  const progressLabel = copy.guidedSetup.progress(
    stepIndex + 1,
    GUIDED_SETUP_STEPS.length
  )

  function persist(partial: Partial<GuidedSetupStorage>) {
    const next: GuidedSetupStorage = {
      skipped: false,
      completed: false,
      stepIndex,
      ...partial,
    }
    writeStorage(next)
    if (next.skipped || next.completed) setVisible(false)
    else setStepIndex(next.stepIndex)
  }

  function onNext() {
    const n = nextSetupStep(stepIndex)
    if (n === 'done') persist({ completed: true, stepIndex })
    else persist({ stepIndex: n })
  }

  function onBack() {
    persist({ stepIndex: prevSetupStep(stepIndex) })
  }

  function onSkip() {
    persist({ skipped: true })
  }

  return (
    <section className="cic-guided-setup" aria-labelledby="guided-setup-title">
      <div className="cic-guided-setup-head">
        <div>
          <p className="cic-demo-inline">{copy.demoLabel}</p>
          <h2 id="guided-setup-title" className="cic-h2" style={{ margin: 0 }}>
            {copy.guidedSetup.title}
          </h2>
          <p className="cic-muted" style={{ margin: '6px 0 0' }}>
            {progressLabel} · {stepCopy.title}
          </p>
        </div>
        <button type="button" className="cic-linkish" onClick={onSkip}>
          {copy.guidedSetup.skip}
        </button>
      </div>

      <p className="cic-lead" style={{ marginTop: 12 }}>
        {stepCopy.body}
      </p>

      {stepId === 'despacho' ? (
        <div className="cic-guided-setup-panel">
          <p className="cic-guided-setup-firm">{snapshot.firmName}</p>
          <p className="cic-muted">{copy.guidedSetup.firmNote}</p>
        </div>
      ) : null}

      {stepId === 'clientes' ? (
        <ul className="cic-guided-setup-list">
          {snapshot.clients.slice(0, 6).map((c) => (
            <li key={c.id}>
              <Link href={`/ciceron/clientes/${c.id}`}>{c.name}</Link>
              <span className="cic-muted"> · {c.industry}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {stepId === 'estados' ? (
        <ul className="cic-guided-setup-list">
          {snapshot.states.slice(0, 8).map((s) => (
            <li key={s.code}>
              <strong>{s.name}</strong>
              <span className="cic-muted"> · {s.statusLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="cic-guided-setup-actions">
        <button
          type="button"
          className="cic-btn cic-btn-secondary cic-btn-compact"
          onClick={onBack}
          disabled={stepIndex === 0}
        >
          {copy.guidedSetup.back}
        </button>
        <button type="button" className="cic-btn cic-btn-compact" onClick={onNext}>
          {stepIndex === GUIDED_SETUP_STEPS.length - 1
            ? copy.guidedSetup.finish
            : copy.guidedSetup.next}
        </button>
      </div>
    </section>
  )
}
