'use client'

import { useEffect, useMemo, useState } from 'react'
import { Headphones, Radio } from 'lucide-react'
import { extractYoutubeVideoId } from '@/lib/youtube'

export interface StreamEmbedProps {
  youtubeVideoId: string | null
  /** Fallback when `youtubeVideoId` is missing (e.g. only URL was stored). */
  youtubeUrl?: string | null
  isLive: boolean
  /** ISO string for countdown when stream not ready */
  matchDate: string
  /** When true, embed recorded video even if `isLive` is false (e.g. completed event replay). */
  embedReplay?: boolean
  locale?: 'en' | 'es'
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatCountdown(ms: number, locale: 'en' | 'es'): string {
  if (ms <= 0) return locale === 'es' ? '¡Ya!' : 'Starting!'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function StreamEmbed({
  youtubeVideoId,
  youtubeUrl,
  isLive,
  matchDate,
  embedReplay = false,
  locale: localeProp,
}: StreamEmbedProps) {
  const [now, setNow] = useState(() => Date.now())
  const locale: 'en' | 'es' =
    localeProp ??
    (typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'es')

  const resolvedVideoId = useMemo(() => {
    const id = youtubeVideoId?.trim()
    if (id) return id
    return extractYoutubeVideoId(youtubeUrl ?? null)
  }, [youtubeVideoId, youtubeUrl])

  const watchHref = resolvedVideoId
    ? `https://www.youtube.com/watch?v=${resolvedVideoId}`
    : youtubeUrl?.trim() || null

  const target = useMemo(() => new Date(matchDate).getTime(), [matchDate])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = Math.max(0, target - now)
  const showPlaceholder = !resolvedVideoId || (!isLive && !embedReplay)

  if (showPlaceholder) {
    return (
      <div className="relative aspect-video min-h-0 w-full max-w-full overflow-hidden rounded-xl bg-[#1a2029] shadow-lg shadow-black/40 ring-1 ring-white/10">
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-0 sm:px-6">
          <Radio className="mb-3 h-10 w-10 text-slate-500" aria-hidden />
          <p className="text-base font-semibold text-white/95 sm:text-lg">
            {locale === 'es' ? 'La transmisión empieza pronto' : 'Stream starting soon'}
          </p>
          <p
            className="mt-2 animate-pulse text-lg font-semibold text-emerald-400 sm:text-xl"
            suppressHydrationWarning
          >
            {formatCountdown(remaining, locale)}
          </p>
          {watchHref && (
            <a
              href={watchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <Headphones className="h-4 w-4 shrink-0" />
              {locale === 'es' ? 'Ver en YouTube →' : 'Watch on YouTube →'}
            </a>
          )}
        </div>
      </div>
    )
  }

  const embedParams = new URLSearchParams({
    autoplay: embedReplay ? '0' : '1',
    mute: embedReplay ? '0' : '1',
    playsinline: '1',
    controls: '1',
    modestbranding: '1',
    rel: '0',
  })
  if (isLive) embedParams.set('enablejsapi', '1')

  return (
    <div className="relative aspect-video w-full max-w-full min-h-0 overflow-hidden rounded-xl bg-black shadow-lg shadow-black/40 ring-1 ring-white/10">
      {isLive && (
        <span className="absolute left-3 top-3 z-10 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-red-600/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          EN VIVO
        </span>
      )}
      <iframe
        title="Conscious Live stream"
        src={`https://www.youtube.com/embed/${resolvedVideoId}?${embedParams.toString()}`}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="eager"
      />
    </div>
  )
}
