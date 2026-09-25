'use client'

import { useCallback, useEffect, useState } from 'react'

type Props = {
  url: string
  title: string
}

export default function RecognitionShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`

  const onNativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return
    try {
      await navigator.share({ title, url, text: title })
    } catch {
      // User cancelled or share failed — ignore.
    }
  }, [title, url])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [url])

  const btn =
    'inline-flex items-center justify-center rounded-xl border border-slate-700 bg-[#151c26] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-300'

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
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
