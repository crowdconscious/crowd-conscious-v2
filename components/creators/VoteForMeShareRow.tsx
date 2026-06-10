'use client'

import { useState } from 'react'
import { Check, Copy, Download, MessageCircle } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import { trackShare, withShareUtm } from '@/lib/share-utils'

type Props = {
  profileId: string
  handle: string
  locale: CreatorLocale
  /** trackShare surface, e.g. 'creator_profile' | 'creator_dashboard'. */
  surface: string
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
}

/**
 * "Vota por mí" share actions for the profile owner while the score is
 * still unrevealed (<10 votes) — the moment the creator is most motivated
 * to recruit voters (strategy doc §5.3). Copy per the share-cards matrix.
 */
export default function VoteForMeShareRow({ profileId, handle, locale, surface }: Props) {
  const t = getCreatorCopy(locale)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const baseUrl = getBaseUrl()
  const pageUrl = `${baseUrl}/creators/${encodeURIComponent(handle)}`

  const shareWhatsApp = () => {
    const text = t.voteForMeShareLine(withShareUtm(pageUrl, 'whatsapp'))
    trackShare({ type: 'creator', creatorProfileId: profileId }, 'whatsapp', surface, 'link')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const downloadStory = async () => {
    setDownloading(true)
    try {
      const storyUrl = `${baseUrl}/api/og/creator/${encodeURIComponent(handle)}?variant=vote&format=story${locale === 'en' ? '&lang=en' : ''}`
      const res = await fetch(storyUrl)
      if (!res.ok) throw new Error(`OG fetch ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = 'vota-por-mi-story.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      trackShare(
        { type: 'creator', creatorProfileId: profileId },
        'story_download',
        surface,
        'png'
      )
    } catch (e) {
      console.error('[VoteForMeShareRow] story download failed:', e)
    } finally {
      setDownloading(false)
    }
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(
        t.voteForMeShareLine(withShareUtm(pageUrl, 'clipboard'))
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      trackShare({ type: 'creator', creatorProfileId: profileId }, 'clipboard', surface, 'link')
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
      <p className="font-semibold text-white">{t.voteForMeTitle}</p>
      <p className="mt-1 text-sm text-slate-400">{t.voteForMeBody}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {t.voteForMeWhatsApp}
        </button>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void downloadStory()}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {t.voteForMeStory}
        </button>
        <button
          type="button"
          onClick={() => void copyMessage()}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#2d3748] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a2029]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t.creatorShareCopied : t.voteForMeCopy}
        </button>
      </div>
    </div>
  )
}
