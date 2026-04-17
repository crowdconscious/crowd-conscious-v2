'use client'

import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import type { ShareTarget } from '@/lib/share-utils'
import { trackShare } from '@/lib/share-utils'

interface Props {
  target: ShareTarget
  /** Plain text title (market question or location name). */
  title: string
  /** Canonical absolute URL to the page being shared. */
  url: string
  /** Optional vote count to include as social proof. */
  voteCount?: number
  locale?: 'es' | 'en'
  surface?: string
  /** Copy at the top of the card. Defaults to localized post-vote string. */
  headline?: string
}

/**
 * Compact post-vote share card. WhatsApp-first because Mexico. Falls back
 * to the Web Share API on mobile (so iMessage / Telegram / etc. show up)
 * and a clipboard copy on desktop.
 */
export function PostVoteShare({
  target,
  title,
  url,
  voteCount,
  locale = 'es',
  surface = 'post_vote',
  headline,
}: Props) {
  const [copied, setCopied] = useState(false)

  const proofLine =
    voteCount && voteCount > 0
      ? locale === 'es'
        ? `${voteCount} ${voteCount === 1 ? 'persona ya votó' : 'personas ya votaron'}. `
        : `${voteCount} ${voteCount === 1 ? 'person has voted' : 'people have voted'}. `
      : ''

  const question =
    target.type === 'location'
      ? locale === 'es'
        ? `¿Es ${title} un Lugar Consciente?`
        : `Is ${title} a Conscious Location?`
      : title

  const shareText =
    locale === 'es'
      ? `${question}\n${proofLine}¿Tú qué opinas? ${url}`
      : `${question}\n${proofLine}What do you think? ${url}`

  const defaultHeadline =
    locale === 'es'
      ? '¡Voto registrado! Compártelo y trae a alguien contigo.'
      : 'Vote recorded! Share it and bring someone along.'

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
    trackShare(target, 'whatsapp', surface)
  }

  const handleNative = async () => {
    const nav = typeof navigator !== 'undefined' ? navigator : null
    if (nav?.share) {
      try {
        await nav.share({ title: question, text: shareText, url })
        trackShare(target, 'native_share', surface)
        return
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        // fall through to clipboard
      }
    }
    if (nav?.clipboard) {
      try {
        await nav.clipboard.writeText(shareText)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
        trackShare(target, 'clipboard', surface)
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-[#0f1419]/80 p-4">
      <p className="text-sm font-medium text-white">{headline ?? defaultHeadline}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleWhatsApp}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.126 1.522 5.867L.06 23.636l5.9-1.482A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.877 0-3.63-.51-5.138-1.398l-.364-.217-3.507.88.935-3.415-.236-.378A9.93 9.93 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          {locale === 'es' ? 'WhatsApp' : 'WhatsApp'}
        </button>
        <button
          type="button"
          onClick={handleNative}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#2d3748] bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              {locale === 'es' ? '¡Copiado!' : 'Copied!'}
            </>
          ) : (
            <>
              {typeof navigator !== 'undefined' && (navigator as Navigator).share ? (
                <Share2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {locale === 'es' ? 'Más opciones' : 'More options'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
