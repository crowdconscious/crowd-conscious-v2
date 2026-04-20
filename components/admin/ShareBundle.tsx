'use client'

import { useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'

type Props = {
  slug: string
  title: string
  pulseMarketId: string | null
}

type Snippet = {
  key: string
  label: string
  value: string
}

/**
 * Share Bundle — appears under each PUBLISHED case-study post in the admin
 * agents page. Goal: founder-grade distribution in <2 minutes (audit §3.1).
 *
 * Each card is copy-to-clipboard; we deliberately don't pre-shorten URLs or
 * pre-shorten captions — the founder edits in the next step. Bilingual (ES/EN)
 * because we publish bilingual.
 *
 * Uses NEXT_PUBLIC_APP_URL when set, otherwise window.location.origin so the
 * URLs render correctly in preview deployments.
 */
export default function ShareBundle({ slug, title, pulseMarketId }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const origin = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.origin
    return process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app'
  }, [])

  const blogUrl = `${origin}/blog/${slug}`
  const pulseUrl = pulseMarketId ? `${origin}/pulse/${pulseMarketId}` : null
  const ogUrl = `${origin}/api/og/blog/${slug}`

  // Copy templates use the SHORTER URL the audience clicks (blog), with the
  // pulse URL only inside variants where it adds proof.
  const snippets: Snippet[] = [
    {
      key: 'blog-url',
      label: 'Blog URL',
      value: blogUrl,
    },
    ...(pulseUrl
      ? [{ key: 'pulse-url', label: 'Pulse result URL', value: pulseUrl }]
      : []),
    {
      key: 'og-url',
      label: 'OG image URL',
      value: ogUrl,
    },
    {
      key: 'tweet-es',
      label: 'Tweet (ES)',
      value: `${title}\n\nLeer el caso de estudio →\n${blogUrl}`,
    },
    {
      key: 'tweet-en',
      label: 'Tweet (EN)',
      value: `${title}\n\nRead the case study →\n${blogUrl}`,
    },
    {
      key: 'linkedin-es',
      label: 'LinkedIn post (ES)',
      value: `Acabamos de publicar un caso de estudio sobre lo que reveló nuestro último Pulse.\n\n${title}\n\nLa diferencia entre una encuesta común y un Pulse: la confianza ponderada cambia la lectura. Lo desglosamos aquí: ${blogUrl}${pulseUrl ? `\n\nResultados completos del Pulse: ${pulseUrl}` : ''}`,
    },
    {
      key: 'linkedin-en',
      label: 'LinkedIn post (EN)',
      value: `Just published a case study on what our last Pulse revealed.\n\n${title}\n\nThe difference between a typical poll and a Pulse: confidence-weighting changes the read. Full breakdown: ${blogUrl}${pulseUrl ? `\n\nFull Pulse results: ${pulseUrl}` : ''}`,
    },
    {
      key: 'instagram-es',
      label: 'Instagram caption (ES)',
      value: `${title}\n\nNuevo caso de estudio en el blog. Link en bio o copia: ${blogUrl}\n\n#ConsciousPulse #CDMX`,
    },
    {
      key: 'instagram-en',
      label: 'Instagram caption (EN)',
      value: `${title}\n\nNew case study on the blog. Link in bio or copy: ${blogUrl}\n\n#ConsciousPulse #MexicoCity`,
    },
    {
      key: 'whatsapp-es',
      label: 'WhatsApp forward (ES)',
      value: `Hey — acabamos de publicar un caso de estudio que creo te puede interesar:\n\n${title}\n\n${blogUrl}`,
    },
    {
      key: 'whatsapp-en',
      label: 'WhatsApp forward (EN)',
      value: `Hey — just published a case study I think you'll find interesting:\n\n${title}\n\n${blogUrl}`,
    },
  ]

  const copy = async (s: Snippet) => {
    try {
      await navigator.clipboard.writeText(s.value)
      setCopiedKey(s.key)
      setTimeout(() => setCopiedKey((k) => (k === s.key ? null : k)), 1400)
    } catch {
      window.prompt('Copy to clipboard:', s.value)
    }
  }

  return (
    <div className="border-t border-slate-700 pt-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-2">
        Share bundle
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {snippets.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => copy(s)}
            className="text-left px-3 py-2 rounded-md bg-slate-900/60 border border-slate-700 hover:border-emerald-600/40 hover:bg-slate-900 transition-colors"
            title={`Copy ${s.label}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {s.label}
              </span>
              {copiedKey === s.key ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 break-words">
              {s.value}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
