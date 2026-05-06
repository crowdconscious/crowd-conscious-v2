'use client'

/**
 * Short TL;DR rendered under the cover image. If the author writes multiple
 * lines we render them as bullets; a single line renders as a paragraph.
 *
 * Goal: give a 30-second reader the punchline without scrolling, and (when
 * a Pulse is embedded right below) push them straight to the vote.
 *
 * Also fires lightweight engagement events:
 *   - tldr_card_view: fires once when the card scrolls into view (IntersectionObserver).
 *   - tldr_cta_click: fires when the “Vota ahora ↓” pill is clicked.
 *
 * Both events flow through /api/share/track using the `other_type` /
 * `other_id` escape hatch, so we get attribution into the same table the
 * weekly digest already reads from. No new schema needed.
 */

import { useEffect, useRef, useState } from 'react'

type LiveStats = {
  marketId: string | null
  totalVotes: number
  avgConfidence: number | null
  status: 'active' | 'closed' | 'unknown'
}

type Props = {
  tldr: string
  locale: 'es' | 'en'
  voteAnchorId?: string | null
  blogSlug: string
  stats?: LiveStats | null
}

function splitLines(raw: string): string[] {
  return raw
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*[-*•·]\s*/, '').trim())
    .filter(Boolean)
}

function trackTldrEvent(
  eventType: 'view' | 'cta_click',
  blogSlug: string,
  marketId: string | null
): void {
  if (typeof window === 'undefined') return
  const otherType = eventType === 'view' ? 'blog_tldr_view' : 'blog_tldr_cta_click'
  try {
    void fetch('/api/share/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: 'other',
        surface: `blog:${blogSlug}`,
        other_type: otherType,
        other_id: blogSlug,
        ...(marketId ? { market_id: marketId } : {}),
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Tracking must never break the page — swallow.
  }
}

function formatVotes(n: number, locale: 'es' | 'en'): string {
  if (n === 1) return locale === 'en' ? '1 vote' : '1 voto'
  return locale === 'en' ? `${n.toLocaleString('en-US')} votes` : `${n.toLocaleString('es-MX')} votos`
}

export function BlogTldrCard({ tldr, locale, voteAnchorId, blogSlug, stats }: Props) {
  const lines = splitLines(tldr)
  const cardRef = useRef<HTMLElement | null>(null)
  const [hasViewed, setHasViewed] = useState(false)

  useEffect(() => {
    if (hasViewed) return
    const el = cardRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      // Old browser — count any render as a view.
      trackTldrEvent('view', blogSlug, stats?.marketId ?? null)
      setHasViewed(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            trackTldrEvent('view', blogSlug, stats?.marketId ?? null)
            setHasViewed(true)
            observer.disconnect()
            return
          }
        }
      },
      { threshold: [0.4] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasViewed, blogSlug, stats?.marketId])

  if (lines.length === 0) return null

  const isBullets = lines.length >= 2
  const label = locale === 'en' ? 'In 30 seconds' : 'En 30 segundos'
  const showStats =
    stats && stats.totalVotes > 0 && stats.marketId !== null

  const handleCtaClick = () => {
    trackTldrEvent('cta_click', blogSlug, stats?.marketId ?? null)
  }

  return (
    <aside
      ref={cardRef}
      className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 md:p-6"
      aria-label={label}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
        {label}
      </p>
      {isBullets ? (
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-100 md:text-base">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-slate-100 md:text-base">{lines[0]}</p>
      )}

      {showStats ? (
        <p className="mt-4 text-xs text-slate-300/80">
          {locale === 'en' ? (
            <>
              <span className="font-semibold text-emerald-300">
                {formatVotes(stats!.totalVotes, locale)}
              </span>
              {stats!.avgConfidence !== null ? (
                <>
                  {' '}
                  · avg confidence{' '}
                  <span className="font-semibold text-emerald-300">
                    {stats!.avgConfidence.toFixed(1)}/10
                  </span>
                </>
              ) : null}
              {stats!.status === 'active' ? <> · open now</> : null}
            </>
          ) : (
            <>
              <span className="font-semibold text-emerald-300">
                {formatVotes(stats!.totalVotes, locale)}
              </span>
              {stats!.avgConfidence !== null ? (
                <>
                  {' '}
                  · confianza promedio{' '}
                  <span className="font-semibold text-emerald-300">
                    {stats!.avgConfidence.toFixed(1)}/10
                  </span>
                </>
              ) : null}
              {stats!.status === 'active' ? <> · abierto ahora</> : null}
            </>
          )}
        </p>
      ) : null}

      {voteAnchorId ? (
        <a
          href={`#${voteAnchorId}`}
          onClick={handleCtaClick}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          {locale === 'en' ? 'Vote now' : 'Vota ahora'}
          <span aria-hidden>↓</span>
        </a>
      ) : null}
    </aside>
  )
}

export default BlogTldrCard
