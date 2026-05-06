'use client'

/**
 * Mobile-only sticky bar that surfaces the Pulse vote CTA once the user
 * has scrolled past the embed without voting. Watches the embed element
 * with IntersectionObserver:
 *
 *   - Embed in view or still below the viewport → bar hidden.
 *   - Embed scrolled completely above the viewport → bar visible.
 *
 * Tapping the bar smooth-scrolls back to the embed. We never show this on
 * tablet/desktop (≥ sm) because the embed is generally still on-screen.
 */

import { useEffect, useState } from 'react'

type Props = {
  embedAnchorId: string
  locale: 'es' | 'en'
  blogSlug: string
  marketId?: string | null
}

function trackBarClick(blogSlug: string, marketId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    void fetch('/api/share/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: 'other',
        surface: `blog_sticky:${blogSlug}`,
        other_type: 'blog_pulse_sticky_click',
        other_id: blogSlug,
        ...(marketId ? { market_id: marketId } : {}),
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore — tracking must never break interaction
  }
}

export default function BlogPulseStickyCta({
  embedAnchorId,
  locale,
  blogSlug,
  marketId,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = document.getElementById(embedAnchorId)
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(false)
            return
          }
          // Only show when scrolled BELOW the embed (its bottom edge is
          // above the viewport). This avoids showing the bar before the
          // user has reached the embed for the first time.
          const scrolledPast = entry.boundingClientRect.bottom < 0
          setVisible(scrolledPast)
        }
      },
      { threshold: [0, 0.05] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [embedAnchorId])

  const handleClick = () => {
    trackBarClick(blogSlug, marketId ?? null)
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 transition-all duration-200 sm:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <a
        href={`#${embedAnchorId}`}
        onClick={handleClick}
        className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-2xl shadow-black/40 transition active:scale-95"
        tabIndex={visible ? 0 : -1}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>⏱</span>
          <span>{locale === 'en' ? '30s · Vote now' : '30s · Vota ahora'}</span>
        </span>
        <span aria-hidden className="text-base">↑</span>
      </a>
    </div>
  )
}
