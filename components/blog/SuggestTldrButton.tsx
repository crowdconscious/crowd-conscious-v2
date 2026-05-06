'use client'

import { useState } from 'react'

type Props = {
  title: string
  titleEn: string
  content: string
  contentEn: string
  pulseMarketId: string | null
  onSuggested: (tldrEs: string, tldrEn: string) => void
  /** When true, only update fields that are currently empty. */
  preserveExisting?: boolean
  currentTldr?: string
  currentTldrEn?: string
}

/**
 * Small button that asks Claude Haiku to draft a 3-bullet TL;DR (ES + EN)
 * from the post's title and body. Used by both the create and edit forms.
 *
 * The button stays disabled until there's enough content to summarize and
 * tells the user clearly when something goes wrong (rate limit, missing
 * env var, parse failure) instead of silently failing.
 */
export default function SuggestTldrButton({
  title,
  titleEn,
  content,
  contentEn,
  pulseMarketId,
  onSuggested,
  preserveExisting,
  currentTldr,
  currentTldrEn,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const ready = title.trim().length > 4 && content.trim().length > 200

  const handleClick = async () => {
    setErr('')
    setLoading(true)
    try {
      const res = await fetch('/api/predictions/admin/blog-posts/suggest-tldr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          title_en: titleEn,
          content,
          content_en: contentEn,
          pulse_market_id: pulseMarketId,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        tldr_es?: string
        tldr_en?: string
        error?: string
      }
      if (!res.ok || !json.tldr_es) {
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
      const nextEs = preserveExisting && currentTldr?.trim() ? currentTldr : json.tldr_es
      const nextEn =
        preserveExisting && currentTldrEn?.trim() ? currentTldrEn : json.tldr_en ?? ''
      onSuggested(nextEs, nextEn)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={!ready || loading}
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden>✨</span>
        {loading ? 'Generando…' : 'Sugerir TL;DR con IA'}
      </button>
      {!ready ? (
        <span className="text-xs text-slate-500">
          Escribe el título y al menos un par de párrafos primero.
        </span>
      ) : null}
      {err ? <span className="text-xs text-amber-400">{err}</span> : null}
    </div>
  )
}
