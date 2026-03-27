'use client'

import { useEffect, useMemo, useState } from 'react'
import { Headphones, Radio } from 'lucide-react'

export interface StreamEmbedProps {
  youtubeVideoId: string | null
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
  isLive,
  matchDate,
  embedReplay = false,
  locale: localeProp,
}: StreamEmbedProps) {
  const [now, setNow] = useState(() => Date.now())
  const locale: 'en' | 'es' =
    localeProp ??
    (typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'es')

  const target = useMemo(() => new Date(matchDate).getTime(), [matchDate])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = Math.max(0, target - now)
  const showPlaceholder = !youtubeVideoId || (!isLive && !embedReplay)

  if (showPlaceholder) {
    return (
      <div className="relative w-full max-w-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-900 to-black shadow-lg shadow-black/40 ring-1 ring-white/10 aspect-video min-h-0">
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-0 sm:px-6">
          <Radio className="mb-3 h-10 w-10 text-slate-500" aria-hidden />
          <p className="text-base font-semibold text-white/95 sm:text-lg">
            {locale === 'es' ? 'Transmisión no disponible aún' : 'Stream not available yet'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {locale === 'es'
              ? 'Mientras tanto, puedes seguir el audio en YouTube.'
              : 'You can follow audio on YouTube in the meantime.'}
          </p>
          <p
            className="mt-6 font-mono text-3xl font-bold tabular-nums text-emerald-400/95 sm:text-4xl"
            suppressHydrationWarning
          >
            {formatCountdown(remaining, locale)}
          </p>
          {youtubeVideoId && (
            <a
              href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-white/10"
            >
              <Headphones className="h-4 w-4 shrink-0" />
              {locale === 'es' ? 'Abrir en YouTube (audio / video)' : 'Open in YouTube (audio / video)'}
            </a>
          )}
        </div>
      </div>
    )
  }

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
        src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=${embedReplay ? 0 : 1}&mute=${embedReplay ? 0 : 1}&controls=1&modestbranding=1${isLive ? '&enablejsapi=1' : ''}`}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}
