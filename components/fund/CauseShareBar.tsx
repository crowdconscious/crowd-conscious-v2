'use client'

import { useState } from 'react'
import { Check, Copy, Download, Instagram, Share2, Twitter } from 'lucide-react'
import { trackShare, type ShareChannel } from '@/lib/share-utils'

interface Props {
  causeId: string
  slug: string
  name: string
  shortDescription?: string | null
  locale?: 'es' | 'en'
  /** Optional attribution tag (e.g. from /kit?token=...). Appended as ?ref= */
  refToken?: string | null
}

/**
 * Above-the-fold share bar on /fund/causes/[slug]. Bilingual. Pre-written
 * copy because cause organizations will paste whatever we give them —
 * nobody is writing their own tweet at 9pm.
 *
 * Attribution: every outbound link carries `?ref=<refToken>` when the
 * visitor landed on the cause page via a reshare kit, so we can eventually
 * trace votes back to the cause's own network.
 */
export function CauseShareBar({
  causeId,
  slug,
  name,
  shortDescription,
  locale = 'es',
  refToken,
}: Props) {
  const [copied, setCopied] = useState(false)

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://crowdconscious.app'
  const targetPath = `/fund/causes/${slug}`
  const urlWithRef = refToken
    ? `${baseUrl}${targetPath}?ref=${encodeURIComponent(refToken)}`
    : `${baseUrl}${targetPath}`

  const L = (es: string, en: string) => (locale === 'es' ? es : en)

  const desc =
    shortDescription?.trim() ||
    L(
      'una organización verificada por la comunidad de Crowd Conscious',
      'a community-verified organization on Crowd Conscious'
    )

  const waText = L(
    `Te comparto una causa increíble en Crowd Conscious: ${name} — ${desc}. Vota aquí: ${urlWithRef}`,
    `Sharing an amazing cause on Crowd Conscious: ${name} — ${desc}. Vote here: ${urlWithRef}`
  )

  const twitterText = L(
    `Estoy apoyando a ${name} en el Fondo Consciente de @crowdconscious. Una opinión, un voto. ${urlWithRef}`,
    `I'm backing ${name} in @crowdconscious's Conscious Fund. One opinion, one vote. ${urlWithRef}`
  )

  const target = { type: 'other' as const, otherType: 'cause', otherId: causeId }
  const surface = 'cause_detail'

  const record = (channel: ShareChannel) => trackShare(target, channel, surface)

  const onWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')
    record('whatsapp')
  }

  const onTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`,
      '_blank'
    )
    record('twitter')
  }

  const onInstagramStory = async () => {
    // There is no deep-link to compose an IG Story from the web. Closest
    // approximation: download the OG card PNG, copy the caption, user
    // opens IG and posts manually. Mirrors the market story pattern.
    try {
      const res = await fetch(
        `/api/og/cause/${encodeURIComponent(slug)}?lang=${locale}`
      )
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-story.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      try {
        await navigator.clipboard?.writeText(waText)
      } catch {
        /* clipboard isn't critical */
      }
      record('story_download')
    } catch {
      // Fallback: just copy the caption.
      try {
        await navigator.clipboard?.writeText(waText)
      } catch {
        /* ignore */
      }
      record('clipboard')
    }
  }

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(urlWithRef)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      record('clipboard')
    } catch {
      /* ignore */
    }
  }

  const onNative = async () => {
    const nav = typeof navigator !== 'undefined' ? navigator : null
    if (nav?.share) {
      try {
        await nav.share({ title: name, text: waText, url: urlWithRef })
        record('native_share')
        return
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }
    await onCopyLink()
  }

  return (
    <section
      aria-label={L('Compartir esta causa', 'Share this cause')}
      className="rounded-xl border border-emerald-500/25 bg-[#0f1419]/80 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="h-4 w-4 text-emerald-400" aria-hidden />
        <h2 className="text-sm font-semibold text-white">
          {L('Comparte esta causa', 'Share this cause')}
        </h2>
      </div>
      <p className="text-sm text-slate-300 mb-4">
        {L(
          `¡Gracias por apoyar a ${name}! Comparte para que más personas voten por ella este ciclo.`,
          `Thanks for backing ${name}! Share so more people vote for it this cycle.`
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onWhatsApp}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#20bd5a]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.126 1.522 5.867L.06 23.636l5.9-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.877 0-3.63-.51-5.138-1.398l-.364-.217-3.507.88.935-3.415-.236-.378A9.93 9.93 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          WhatsApp
        </button>
        <button
          type="button"
          onClick={onTwitter}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
        >
          <Twitter className="h-4 w-4" />
          X / Twitter
        </button>
        <button
          type="button"
          onClick={onInstagramStory}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
        >
          <Instagram className="h-4 w-4" />
          {L('Story', 'Story')}
          <Download className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#2d3748] bg-transparent px-3 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              {L('¡Copiado!', 'Copied!')}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {L('Copiar enlace', 'Copy link')}
            </>
          )}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator ? (
          <button
            type="button"
            onClick={onNative}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#2d3748] bg-transparent px-3 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <Share2 className="h-4 w-4" />
            {L('Más opciones', 'More options')}
          </button>
        ) : null}
      </div>
    </section>
  )
}

export default CauseShareBar
