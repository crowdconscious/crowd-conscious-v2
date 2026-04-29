'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, memo, useCallback, useState } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, Sparkles, Star, X, CheckCircle, Share2, ImageIcon, Download, Instagram } from 'lucide-react'
import {
  copyMarketLink,
  downloadCard,
  shareNative,
  shareStoryImage,
  trackShare,
} from '@/lib/share-utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface Achievement {
  type: string
  name: string
  description: string
  icon: string
}

interface CelebrationModalProps {
  isOpen: boolean
  type: 'lesson_completed' | 'module_completed' | 'tier_up' | 'achievement' | 'sponsor' | 'purchase' | 'prediction_trade'
  title: string
  message: string
  xpGained?: number
  /** Anonymous preview vote: hide XP, show message line instead */
  guestVote?: boolean
  /** Shown below title when guestVote (e.g. "Tu predicción fue registrada") */
  guestMessage?: string
  achievements?: Achievement[]
  sharePath?: string
  shareTitle?: string
  /** When present, share text includes "Sponsored by X on Crowd Conscious" */
  shareSponsorName?: string | null
  /** Market ID for OG card image. Used for "Share card" to share the branded image. */
  shareCardMarketId?: string
  /** Conscious Pulse / opinion markets: use “opinion” in share copy */
  isPulseMarket?: boolean
  onClose: () => void
}

/**
 * CelebrationModal Component
 * Shows celebration animations with confetti and XP display
 * Memoized for performance, accessible with keyboard navigation
 */
export const CelebrationModal = memo(function CelebrationModal({
  isOpen,
  type,
  title,
  message,
  xpGained,
  achievements = [],
  sharePath,
  shareTitle,
  shareSponsorName,
  shareCardMarketId,
  isPulseMarket = false,
  guestVote = false,
  guestMessage = 'Tu voto fue registrado',
  onClose
}: CelebrationModalProps) {
  const pulse = isPulseMarket === true
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  
  // ✅ PHASE 4: Keyboard navigation (ESC to close)
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // ✅ PHASE 4: Focus trap - focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      firstFocusable?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || prefersReducedMotion) return

    // Confetti burst
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)

    // Additional bursts for prediction and major achievements
    if (type === 'prediction_trade' || type === 'tier_up' || type === 'module_completed') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        })
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        })
      }, 500)
    }

    return () => clearInterval(interval)
  }, [isOpen, type, prefersReducedMotion])

  const shareUrl = sharePath && typeof window !== 'undefined'
    ? `${window.location.origin}${sharePath}`
    : typeof window !== 'undefined' ? window.location.href : ''
  const shareText = shareTitle
    ? shareSponsorName
      ? pulse
        ? `I shared my opinion on "${shareTitle}" — Sponsored by ${shareSponsorName} on Crowd Conscious! 🎯`
        : `I just predicted on "${shareTitle}" — Sponsored by ${shareSponsorName} on Crowd Conscious! 🎯`
      : pulse
        ? `I shared my opinion on "${shareTitle}" on Crowd Conscious! 🎯`
        : `I just predicted on "${shareTitle}" on Crowd Conscious! 🎯`
    : pulse
      ? 'I shared my opinion on Crowd Conscious! 🎯'
      : 'I just made a prediction on Crowd Conscious! 🎯'
  const shareTextX = shareTitle
    ? shareSponsorName
      ? pulse
        ? `${shareTitle} — Sponsored by ${shareSponsorName}\n\nShare your opinion:`
        : `${shareTitle} — Sponsored by ${shareSponsorName}\n\nMake your prediction:`
      : pulse
        ? `${shareTitle}\n\nShare your opinion:`
        : `${shareTitle}\n\nMake your prediction:`
    : pulse
      ? 'Share your opinion on Crowd Conscious'
      : 'Make your prediction on Crowd Conscious'
  const shareTextWhatsApp = shareTitle
    ? shareSponsorName
      ? pulse
        ? `${shareTitle} — Sponsored by ${shareSponsorName} on Crowd Conscious. Share your opinion: ${shareUrl}`
        : `${shareTitle} — Sponsored by ${shareSponsorName} on Crowd Conscious. Make your prediction: ${shareUrl}`
      : pulse
        ? `${shareTitle} — Share your opinion: ${shareUrl}`
        : `${shareTitle} — Make your prediction: ${shareUrl}`
    : shareUrl
  const shareCardUrl = shareCardMarketId && typeof window !== 'undefined'
    ? `${window.location.origin}/api/og/market/${shareCardMarketId}`
    : null
  const shareCardStoryUrl = shareCardMarketId && typeof window !== 'undefined'
    ? `${window.location.origin}/api/og/market/${shareCardMarketId}?format=story`
    : null

  const shareLinks = sharePath && shareUrl ? {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextX)}&url=${encodeURIComponent(shareUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareTextWhatsApp)}`,
  } : null

  const handleCopyLink = useCallback(() => {
    if (shareCardMarketId) {
      copyMarketLink(shareCardMarketId)
      trackShare({ type: 'market', marketId: shareCardMarketId }, 'clipboard', 'celebration_modal')
    }
  }, [shareCardMarketId])

  const trackModalShare = useCallback(
    (channel: 'whatsapp' | 'twitter' | 'facebook') => {
      if (shareCardMarketId) {
        trackShare({ type: 'market', marketId: shareCardMarketId }, channel, 'celebration_modal')
      }
    },
    [shareCardMarketId]
  )

  const [shareCardLoading, setShareCardLoading] = useState(false)
  const [cardLoaded, setCardLoaded] = useState(false)
  const [cardError, setCardError] = useState(false)
  const [storyToast, setStoryToast] = useState<string | null>(null)

  useEffect(() => {
    if (shareCardMarketId) {
      setCardLoaded(false)
      setCardError(false)
    }
  }, [shareCardMarketId])

  const handleShareCard = useCallback(async () => {
    if (!shareCardMarketId) return
    setShareCardLoading(true)
    try {
      await shareNative(
        shareCardMarketId,
        shareTitle || (pulse ? 'My opinion on Crowd Conscious' : 'My prediction on Crowd Conscious'),
        'standard',
        undefined,
        shareSponsorName
      )
      trackShare({ type: 'market', marketId: shareCardMarketId }, 'native_share', 'celebration_modal')
    } finally {
      setShareCardLoading(false)
    }
  }, [shareCardMarketId, shareTitle, shareSponsorName, pulse])

  const handleDownloadCard = useCallback(async () => {
    if (!shareCardMarketId) return
    setShareCardLoading(true)
    try {
      await downloadCard(shareCardMarketId, 'standard')
      trackShare({ type: 'market', marketId: shareCardMarketId }, 'story_download', 'celebration_modal')
    } finally {
      setShareCardLoading(false)
    }
  }, [shareCardMarketId])

  const showStoryHint = useCallback(() => {
    setStoryToast('Imagen descargada — ábrela en Instagram para compartirla')
    window.setTimeout(() => setStoryToast(null), 6000)
  }, [])

  const handleShareToStories = useCallback(async () => {
    if (!shareCardMarketId) return
    setShareCardLoading(true)
    setStoryToast(null)
    try {
      const result = await shareStoryImage(shareCardMarketId, {
        title: shareTitle || 'Crowd Conscious',
      })
      if (result === 'shared') {
        trackShare({ type: 'market', marketId: shareCardMarketId }, 'native_share', 'celebration_modal_story')
      } else if (result === 'downloaded') {
        trackShare({ type: 'market', marketId: shareCardMarketId }, 'story_download', 'celebration_modal_story')
        showStoryHint()
      }
    } catch (err) {
      console.error('Share to Stories failed:', err)
    } finally {
      setShareCardLoading(false)
    }
  }, [shareCardMarketId, shareTitle, showStoryHint])

  const handleDownloadStory = useCallback(async () => {
    if (!shareCardMarketId) return
    setShareCardLoading(true)
    try {
      await downloadCard(shareCardMarketId, 'story')
      trackShare({ type: 'market', marketId: shareCardMarketId }, 'story_download', 'celebration_modal_story')
      showStoryHint()
    } finally {
      setShareCardLoading(false)
    }
  }, [shareCardMarketId, showStoryHint])

  const getIcon = useCallback(() => {
    switch (type) {
      case 'tier_up':
        return <Trophy className="w-16 h-16 text-yellow-500" aria-hidden="true" />
      case 'module_completed':
        return <Star className="w-16 h-16 text-purple-500" aria-hidden="true" />
      case 'achievement':
        return <Sparkles className="w-16 h-16 text-blue-500" aria-hidden="true" />
      case 'prediction_trade':
        return <CheckCircle className="w-16 h-16 text-emerald-500" aria-hidden="true" />
      default:
        return <Trophy className="w-16 h-16 text-green-500" aria-hidden="true" />
    }
  }, [type])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            aria-describedby="celebration-message"
          >
            <motion.div
              ref={modalRef}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl pointer-events-auto focus:outline-none"
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50 }}
              transition={{
                type: 'spring',
                duration: prefersReducedMotion ? 0.1 : 0.5,
                bounce: prefersReducedMotion ? 0 : 0.3
              }}
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                aria-label="Close celebration"
                autoFocus
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Icon */}
              <motion.div
                className="flex justify-center mb-4"
                animate={prefersReducedMotion ? {} : {
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.5,
                  repeat: prefersReducedMotion ? 0 : 2
                }}
              >
                {getIcon()}
              </motion.div>

              {/* Title */}
              <h2
                id="celebration-title"
                className="text-2xl sm:text-3xl font-bold text-center mb-2 text-slate-900"
              >
                {title}
              </h2>

              {/* Message */}
              <p
                id="celebration-message"
                className="text-center text-slate-600 mb-6"
              >
                {message}
              </p>

              {/* XP Gained — hidden for anonymous preview votes */}
              {guestVote ? (
                <motion.div
                  className="text-center p-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 rounded-lg mb-4 flex items-center justify-center gap-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
                >
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <span className="text-lg font-semibold">{guestMessage}</span>
                </motion.div>
              ) : (
                xpGained != null &&
                xpGained > 0 && (
                  <motion.div
                    className="text-center p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg mb-4 flex items-center justify-center gap-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
                  >
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-xl font-bold">+{xpGained} XP</span>
                  </motion.div>
                )
              )}

              {/* Social share buttons */}
              {shareLinks && (
                <div className="mb-4">
                  {shareCardMarketId && !cardError && (
                    <div className="w-full max-w-md mx-auto mb-4">
                      {!cardLoaded && (
                        <div className="w-full aspect-[1200/630] bg-slate-800 rounded-xl flex items-center justify-center">
                          <span className="text-slate-500 text-sm">Generating your card...</span>
                        </div>
                      )}
                      <img
                        src={`/api/og/market/${shareCardMarketId}`}
                        alt={pulse ? 'Your opinion card' : 'Your prediction card'}
                        className={`w-full rounded-xl border border-slate-700 ${cardLoaded ? 'block' : 'hidden'}`}
                        onLoad={() => setCardLoaded(true)}
                        onError={() => setCardError(true)}
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-600 mb-2 text-center">
                    {pulse ? 'Share your opinion' : 'Share your prediction'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <a
                      href={shareLinks.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackModalShare('twitter')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      X
                    </a>
                    <a
                      href={shareLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackModalShare('facebook')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </a>
                    <a
                      href={shareLinks.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackModalShare('whatsapp')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Copy link
                    </button>
                    {shareCardUrl && (
                      <>
                        <button
                          onClick={handleShareCard}
                          disabled={shareCardLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 font-medium text-sm transition-colors disabled:opacity-60"
                        >
                          <ImageIcon className="w-4 h-4" />
                          {shareCardLoading ? 'Loading…' : 'Share card'}
                        </button>
                        <button
                          onClick={handleDownloadCard}
                          disabled={shareCardLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
                        >
                          <Download className="w-4 h-4" />
                          Download card
                        </button>
                        {shareCardStoryUrl && (
                          <>
                            <button
                              onClick={handleShareToStories}
                              disabled={shareCardLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white font-medium text-sm transition-colors disabled:opacity-60"
                            >
                              <Instagram className="w-4 h-4" />
                              {shareCardLoading ? 'Loading…' : 'Share to Stories'}
                            </button>
                            <button
                              onClick={handleDownloadStory}
                              disabled={shareCardLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
                            >
                              <Download className="w-4 h-4" />
                              Download Story
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Share the branded card (Twitter, WhatsApp) or the Story format for Instagram. Link previews use the standard card.
                  </p>
                  {storyToast && (
                    <p
                      role="status"
                      className="mt-3 text-center text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                    >
                      {storyToast}
                    </p>
                  )}
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div className="space-y-2 mb-6" role="list" aria-label="Unlocked achievements">
                  <p className="text-sm font-semibold text-slate-700 text-center mb-2">
                    New Achievements Unlocked!
                  </p>
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.type}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: prefersReducedMotion ? 0 : 0.3 + index * 0.1 }}
                      role="listitem"
                      aria-label={`Achievement: ${achievement.name}`}
                    >
                      <span className="text-2xl" aria-hidden="true">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{achievement.name}</p>
                        <p className="text-sm text-slate-600">{achievement.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Continue button */}
              <motion.button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                aria-label="Continue"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onClose()
                  }
                }}
              >
                Continue
              </motion.button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
})

