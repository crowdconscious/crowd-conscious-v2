'use client'

import { useCallback, useEffect, useState } from 'react'
import { SHARE_CTA_TEXT_ES } from '@/lib/reconocimientos/constants'

type Props = {
  url: string
  title: string
  recognitionId: string
}

function trackEvent(
  recognitionId: string,
  eventType: 'share_whatsapp' | 'share_native' | 'share_copy'
) {
  const body = JSON.stringify({
    recognition_id: recognitionId,
    event_type: eventType,
    src: 'web',
  })
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/reconocimientos/events', blob)
      return
    }
  } catch {
    // fall through to fetch
  }
  void fetch('/api/reconocimientos/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Metrics are best-effort.
  })
}

export default function RecognitionShareButtons({
  url,
  title,
  recognitionId,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    )
  }, [])

  const shareText = `${title}\n\n${SHARE_CTA_TEXT_ES}\n${url}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  const onNativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return
    try {
      await navigator.share({ title, url, text: shareText })
      trackEvent(recognitionId, 'share_native')
    } catch {
      // User cancelled or share failed — ignore.
    }
  }, [title, url, shareText, recognitionId])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}`)
      setCopied(true)
      trackEvent(recognitionId, 'share_copy')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [shareText, recognitionId])

  const btn =
    'inline-flex items-center justify-center rounded-xl border border-slate-700 bg-[#151c26] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300'

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        onClick={() => trackEvent(recognitionId, 'share_whatsapp')}
      >
        WhatsApp
      </a>
      {canShare && (
        <button type="button" onClick={onNativeShare} className={btn}>
          Compartir
        </button>
      )}
      <button type="button" onClick={onCopy} className={btn}>
        {copied ? 'Copiado' : 'Copiar enlace'}
      </button>
    </div>
  )
}
