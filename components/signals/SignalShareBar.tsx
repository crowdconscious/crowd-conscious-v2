'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import { trackShare, withShareUtm, type ShareChannel } from '@/lib/share-utils'

type Props = {
  locale: CitizenSignalsLocale
  signalId: string
  slug: string
  title: string
  /** When true the bar pins itself to the bottom on mobile. */
  sticky?: boolean
}

function originBase(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
}

/**
 * Public share row for a Citizen Signal.
 *
 * Outputs three primary share intents (WhatsApp, X/Twitter, copy link)
 * plus a `navigator.share` fallback for mobile browsers that expose the
 * native share sheet. Every outbound URL is decorated with
 * `utm_source=share` so we can later attribute traffic back to the
 * channel that delivered each visit.
 *
 * The `sticky` variant pins the bar to the bottom edge of the viewport
 * on small screens — the spec calls out a sticky bottom action row on
 * mobile, while the desktop layout drops the bar inline with the
 * narrative column.
 */
export default function SignalShareBar({
  locale,
  signalId,
  slug,
  title,
  sticky = false,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [copied, setCopied] = useState(false)

  const baseUrl = originBase()
  const targetPath = `/signals/${slug}`

  const buildUrl = (channel: ShareChannel) =>
    withShareUtm(`${baseUrl}${targetPath}`, channel)

  const shareText = (urlForChannel: string) =>
    locale === 'es'
      ? `Apoya esta señal ciudadana en Crowd Conscious: "${title}". Lee y co-firma aquí ${urlForChannel}`
      : `Support this citizen signal on Crowd Conscious: "${title}". Read and co-sign here ${urlForChannel}`

  const target = {
    type: 'other' as const,
    otherType: 'citizen_signal',
    otherId: signalId,
  }
  const surface = 'signal_detail'
  const record = (channel: ShareChannel) => trackShare(target, channel, surface, 'link')

  const onWhatsApp = () => {
    const url = buildUrl('whatsapp')
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText(url))}`,
      '_blank',
      'noopener,noreferrer'
    )
    record('whatsapp')
  }

  const onTwitter = () => {
    const url = buildUrl('twitter')
    const text = encodeURIComponent(shareText(url))
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    )
    record('twitter')
  }

  const onCopyLink = async () => {
    const url = buildUrl('clipboard')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      record('clipboard')
    } catch {
      /* clipboard unavailable — silently fail */
    }
  }

  const onNative = async () => {
    const nav = typeof navigator !== 'undefined' ? navigator : null
    if (nav && typeof nav.share === 'function') {
      try {
        const url = buildUrl('native_share')
        await nav.share({ title, text: shareText(url), url })
        record('native_share')
        return
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
      }
    }
    await onCopyLink()
  }

  const supportsNative =
    typeof navigator !== 'undefined' && 'share' in navigator

  const shellClass = sticky
    ? 'fixed inset-x-0 bottom-0 z-30 border-t border-[#2d3748] bg-[#0f1419]/95 px-4 py-3 backdrop-blur sm:hidden'
    : 'rounded-2xl border border-[#2d3748] bg-[#11161f] p-4'

  return (
    <section aria-label={t.detail.shareTitle} className={shellClass}>
      {!sticky && (
        <div className="mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-emerald-400" aria-hidden />
          <h2 className="text-sm font-semibold text-white">
            {t.detail.shareTitle}
          </h2>
        </div>
      )}
      <div
        className={`flex flex-wrap gap-2 ${sticky ? 'justify-between' : ''}`}
      >
        <button
          type="button"
          onClick={onWhatsApp}
          aria-label={
            locale === 'es' ? 'Compartir por WhatsApp' : 'Share on WhatsApp'
          }
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#20bd5a] sm:flex-none"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.126 1.522 5.867L.06 23.636l5.9-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.877 0-3.63-.51-5.138-1.398l-.364-.217-3.507.88.935-3.415-.236-.378A9.93 9.93 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={onTwitter}
          aria-label={
            locale === 'es' ? 'Compartir en X' : 'Share on X'
          }
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 sm:flex-none"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M18.244 2H21.5l-7.42 8.49L23 22h-6.715l-5.262-6.86L4.97 22H1.713l7.94-9.084L1 2h6.857l4.756 6.297L18.244 2zm-1.176 18h1.86L7.06 4H5.07L17.07 20z" />
          </svg>
          <span>X</span>
        </button>

        <button
          type="button"
          onClick={() => void onCopyLink()}
          aria-label={locale === 'es' ? 'Copiar enlace' : 'Copy link'}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#2d3748] bg-transparent px-3 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300 sm:flex-none"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" aria-hidden />
              <span>{locale === 'es' ? '¡Copiado!' : 'Copied!'}</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              <span>{locale === 'es' ? 'Copiar' : 'Copy'}</span>
            </>
          )}
        </button>

        {supportsNative && (
          <button
            type="button"
            onClick={() => void onNative()}
            aria-label={
              locale === 'es' ? 'Más opciones para compartir' : 'More share options'
            }
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#2d3748] bg-transparent px-3 py-2 text-sm font-medium text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">
              {locale === 'es' ? 'Más' : 'More'}
            </span>
          </button>
        )}
      </div>
    </section>
  )
}
