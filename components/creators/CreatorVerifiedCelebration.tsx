'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Download, MessageCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import { trackShare, withShareUtm } from '@/lib/share-utils'

type Props = {
  profileId: string
  handle: string
  certifiedAt: string
  locale: CreatorLocale
  /** trackShare surface, e.g. 'creator_profile' | 'creator_dashboard'. */
  surface: string
}

const SEEN_KEY_PREFIX = 'cc-creator-verified-seen:'

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
}

/**
 * Verification-moment celebration (Creators Phase 2). Shown once per
 * certification to the certified creator on their own profile or dashboard,
 * keyed in localStorage by certified_at so a re-certification (90-day
 * review) celebrates again — no migration needed. Modeled on
 * components/locations/admin/LocationCreatedShareCard.
 */
export default function CreatorVerifiedCelebration({
  profileId,
  handle,
  certifiedAt,
  locale,
  surface,
}: Props) {
  const t = getCreatorCopy(locale)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const seenKey = `${SEEN_KEY_PREFIX}${profileId}`
  const baseUrl = getBaseUrl()
  const pageUrl = `${baseUrl}/creators/${encodeURIComponent(handle)}`
  const ogUrl = `${baseUrl}/api/og/creator/${encodeURIComponent(handle)}${locale === 'en' ? '?lang=en' : ''}`

  useEffect(() => {
    try {
      if (window.localStorage.getItem(seenKey) !== certifiedAt) setOpen(true)
    } catch {
      // localStorage unavailable — skip the celebration rather than loop it
    }
  }, [seenKey, certifiedAt])

  const dismiss = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(seenKey, certifiedAt)
    } catch {
      // ignore
    }
  }

  const shareWhatsApp = () => {
    const url = withShareUtm(pageUrl, 'whatsapp')
    const text = t.verifiedShareLine(url)
    trackShare({ type: 'creator', creatorProfileId: profileId }, 'whatsapp', surface, 'link')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const downloadStory = async () => {
    setDownloading(true)
    try {
      const storyUrl = `${baseUrl}/api/og/creator/${encodeURIComponent(handle)}?format=story${locale === 'en' ? '&lang=en' : ''}`
      const res = await fetch(storyUrl)
      if (!res.ok) throw new Error(`OG fetch ${res.status}`)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = 'creador-consciente-story.png'
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
      console.error('[CreatorVerifiedCelebration] story download failed:', e)
    } finally {
      setDownloading(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(withShareUtm(pageUrl, 'clipboard'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      trackShare({ type: 'creator', creatorProfileId: profileId }, 'clipboard', surface, 'link')
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label={t.celebrationClose}
            onClick={dismiss}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0f1419] shadow-2xl"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label={t.celebrationClose}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-[#2d3748] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                {t.celebrationEyebrow}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">{t.celebrationTitle}</h2>
              <p className="mt-1 text-sm text-slate-400">{t.celebrationBody}</p>
            </div>

            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]">
                <div className="relative aspect-[1200/630] w-full bg-[#0f1419]">
                  {/* OG card preview — unoptimized so we hit the live route */}
                  <Image
                    src={ogUrl}
                    alt={t.celebrationTitle}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t.celebrationWhatsApp}
                </button>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => void downloadStory()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {t.celebrationDownloadStory}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#2d3748] px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-[#1a2029]"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? t.creatorShareCopied : t.celebrationCopyLink}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
