'use client'

import { useState, useTransition } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { FeedbackSuggestion } from '@/lib/ciceron/engagement/feedback-loop'
import { applyFeedbackSuggestionAction } from '@/app/ciceron/(rooms)/hoy/actions'

export function FeedbackSuggest({ suggestion }: { suggestion: FeedbackSuggestion }) {
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
        Ajuste registrado en el perfil de vigilancia.
      </p>
    )
  }

  return (
    <section className="cic-section" aria-labelledby="hoy-feedback">
      <h2 id="hoy-feedback" className="cic-h2">
        {copy.engagement.feedbackSuggestTitle}
      </h2>
      <p style={{ maxWidth: '42rem' }}>{suggestion.suggestionEs}</p>
      <button
        type="button"
        className="cic-btn"
        disabled={pending || !suggestion.watchProfileId}
        onClick={() => {
          start(async () => {
            if (!suggestion.watchProfileId) return
            const res = await applyFeedbackSuggestionAction(
              suggestion.watchProfileId,
              suggestion.reasonCode
            )
            if (res.ok) setDone(true)
          })
        }}
      >
        {copy.engagement.feedbackApply}
      </button>
    </section>
  )
}
