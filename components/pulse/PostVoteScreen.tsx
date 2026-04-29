'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Download, ImageIcon, Instagram, Share2, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  copyMarketLink,
  downloadCard,
  shareNative,
  shareStoryImage,
  shareToFacebook,
  shareToTwitter,
  shareToWhatsApp,
  trackShare,
} from '@/lib/share-utils'
import { trackPostVoteEvent } from '@/lib/post-vote-analytics'

/**
 * Post-vote conversion screen — replaces the legacy XP-celebration modal
 * for prediction-market and Pulse votes.
 *
 * Order on mobile (max-w-md):
 *   1. Validation header — "Tu voto cuenta" + echo of choice + crowd %.
 *   2. Newsletter capture (guests only) OR "Ver más consultas" (registered).
 *   3. Demoted share row + "Más opciones de compartir" disclosure.
 *   4. Tertiary close link.
 *
 * Tap targets are ≥44px. There is intentionally NO "create account" CTA
 * here — that conversion happens via /pulse and the GuestRegistrationPrompt
 * elsewhere. This screen is for newsletter capture + lightweight reshare.
 */

export interface PostVoteOutcomeStat {
  outcomeId: string
  label: string
  subtitle?: string | null
  /** 0..1 share of community votes for this outcome. */
  probability: number
  /** 0..10 average confidence for this outcome (null when no votes). */
  avgConfidence: number | null
}

export interface PostVoteScreenProps {
  isOpen: boolean
  marketId: string
  marketTitle: string
  /**
   * The outcome the user just picked plus its current community share.
   * Pass null for guest-update or no-change paths so we render a generic
   * confirmation. Passing the full stat unlocks the validation copy.
   */
  votedOutcome: PostVoteOutcomeStat | null
  userType: 'guest' | 'registered'
  locale: 'es' | 'en'
  /** Total votes across the market (used for "X% of N people"). */
  totalVotes?: number
  /** XP awarded — registered only; ignored for guests. */
  xpEarned?: number | null
  /** For sharing copy. */
  sponsorName?: string | null
  /** Callback to close the modal. */
  onClose: () => void
}

const MIN_TAP = 'min-h-[44px]'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function formatPercent(n: number): number {
  return Math.round(Math.max(0, Math.min(1, n)) * 100)
}

export default function PostVoteScreen({
  isOpen,
  marketId,
  marketTitle,
  votedOutcome,
  userType,
  locale,
  totalVotes,
  xpEarned,
  sponsorName,
  onClose,
}: PostVoteScreenProps) {
  const es = locale === 'es'
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const [moreShareOpen, setMoreShareOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState<null | { already: boolean }>(null)

  // Reset when reopened with a new vote (e.g. user changes their vote
  // and triggers the screen again).
  useEffect(() => {
    if (!isOpen) return
    setMoreShareOpen(false)
    setEmail('')
    setEmailErr(null)
    setSubmitting(false)
    setSubscribed(null)
  }, [isOpen, marketId, votedOutcome?.outcomeId])

  // Focus the close button on open + Esc to dismiss + body scroll lock.
  useEffect(() => {
    if (!isOpen) return
    const previousActive = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previousActive?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleClose = useCallback(() => {
    trackPostVoteEvent('close_post_vote_screen', {
      marketId,
      userType,
      locale,
    })
    onClose()
  }, [marketId, userType, locale, onClose])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed) || trimmed.length > 254) {
      setEmailErr(es ? 'Correo inválido' : 'Invalid email')
      return
    }
    setEmailErr(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          source: `post_vote_${marketId}`,
          language: locale,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 429 / 500 — keep form available, surface a friendly hint.
        setEmailErr(
          es
            ? 'No pudimos suscribirte. Intenta de nuevo.'
            : "We couldn't subscribe you. Please try again."
        )
        return
      }
      const already = data?.already === true
      setSubscribed({ already })
      trackPostVoteEvent('newsletter_signup_post_vote', {
        marketId,
        userType,
        locale,
        alreadySubscribed: already,
      })
    } catch {
      setEmailErr(
        es
          ? 'No pudimos suscribirte. Intenta de nuevo.'
          : "We couldn't subscribe you. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const trackShareClick = (channel: string) => {
    trackPostVoteEvent('share_click_post_vote', {
      marketId,
      userType,
      locale,
      channel,
    })
    trackShare({ type: 'market', marketId }, channel as Parameters<typeof trackShare>[1], 'post_vote_screen')
  }

  const handleShareTwitter = () => {
    trackShareClick('twitter')
    shareToTwitter(marketId, marketTitle, sponsorName ?? null)
  }
  const handleShareWhatsApp = () => {
    trackShareClick('whatsapp')
    shareToWhatsApp(marketId, marketTitle, sponsorName ?? null)
  }
  const handleShareFacebook = () => {
    trackShareClick('facebook')
    shareToFacebook(marketId)
  }
  const handleCopy = () => {
    trackShareClick('clipboard')
    copyMarketLink(marketId)
  }
  const handleNative = () => {
    trackShareClick('native_share')
    void shareNative(marketId, marketTitle, 'standard', locale, sponsorName ?? null)
  }
  const handleDownloadCard = () => {
    trackShareClick('story_download')
    void downloadCard(marketId, 'standard', locale)
  }
  const handleShareStory = () => {
    trackShareClick('story_download')
    void shareStoryImage(marketId, { title: marketTitle, locale })
  }
  const handleDownloadStory = () => {
    trackShareClick('story_download')
    void downloadCard(marketId, 'story', locale)
  }

  // ---- Validation copy --------------------------------------------------
  const pct = votedOutcome ? formatPercent(votedOutcome.probability) : null
  const isMinority = pct !== null && pct < 20
  const validationHeading = es ? 'Tu voto cuenta' : 'Your vote counts'
  const votedLine = votedOutcome
    ? es
      ? `Votaste: ${votedOutcome.label}`
      : `You voted: ${votedOutcome.label}`
    : null
  const totalLine =
    totalVotes && totalVotes > 0
      ? es
        ? `de ${totalVotes.toLocaleString('es-MX')} votos`
        : `of ${totalVotes.toLocaleString('en-US')} votes`
      : null

  // "59% de la comunidad coincide contigo." / minority reframe.
  const crowdLine =
    pct === null
      ? null
      : isMinority
        ? es
          ? `Tu opinión es minoritaria — solo ${pct}% votó así. Las opiniones diversas hacen más rica la consulta.`
          : `Your view is in the minority — only ${pct}% voted this way. Diverse opinions enrich the consultation.`
        : es
          ? `El ${pct}% de la comunidad coincide contigo${totalLine ? ` (${totalLine})` : ''}.`
          : `${pct}% of the community agrees with you${totalLine ? ` (${totalLine})` : ''}.`

  const confidenceLine =
    votedOutcome?.avgConfidence != null && Number.isFinite(votedOutcome.avgConfidence)
      ? es
        ? `Confianza promedio en esta opción: ${votedOutcome.avgConfidence.toFixed(1)}/10`
        : `Average confidence on this option: ${votedOutcome.avgConfidence.toFixed(1)}/10`
      : null

  // ---- Render -----------------------------------------------------------
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-vote-title"
          >
            <motion.div
              ref={dialogRef}
              className="bg-cc-card border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl pointer-events-auto focus:outline-none"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
            >
              {/* Header */}
              <div className="relative px-5 pt-5 pb-3 border-b border-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <span className="text-base">✓</span>
                      <span id="post-vote-title">{validationHeading}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {userType === 'registered' && xpEarned != null && xpEarned > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-300 tabular-nums">
                        +{xpEarned} XP
                      </span>
                    )}
                    <button
                      ref={closeBtnRef}
                      type="button"
                      onClick={handleClose}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      aria-label={es ? 'Cerrar' : 'Close'}
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation block */}
              <div className="px-5 py-4 space-y-2">
                {votedLine && (
                  <p className="text-base font-medium text-white leading-snug break-words">
                    {votedLine}
                  </p>
                )}
                {votedOutcome?.subtitle && (
                  <p className="text-sm text-slate-400 leading-snug">{votedOutcome.subtitle}</p>
                )}
                {crowdLine && (
                  <p className={`text-sm leading-snug ${isMinority ? 'text-amber-200' : 'text-slate-200'}`}>
                    {crowdLine}
                  </p>
                )}
                {confidenceLine && (
                  <p className="text-xs text-slate-500 leading-snug">{confidenceLine}</p>
                )}
              </div>

              {/* Newsletter capture (guest) OR explore CTA (registered) */}
              <div className="px-5 py-4 border-t border-white/5">
                {userType === 'guest' ? (
                  subscribed ? (
                    <div
                      role="status"
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center"
                    >
                      <p className="text-sm font-medium text-emerald-300">
                        {subscribed.already
                          ? es
                            ? '✓ Ya estás suscrito'
                            : "✓ You're already subscribed"
                          : es
                            ? '✓ Estás suscrito'
                            : "✓ You're subscribed"}
                      </p>
                      <p className="mt-1 text-xs text-emerald-200/70">
                        {es
                          ? 'Te avisaremos cuando haya nuevas consultas.'
                          : "We'll let you know when new consultations launch."}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} noValidate>
                      <p className="text-sm font-medium text-white">
                        {es
                          ? 'Recibe los resultados y nuevas consultas'
                          : 'Get results and new consultations'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {es
                          ? 'Sin cuenta. Solo correo. Cancela cuando quieras.'
                          : 'No account. Just email. Unsubscribe anytime.'}
                      </p>
                      <div className="mt-3 space-y-2">
                        <input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder={es ? 'tu@email.com' : 'you@email.com'}
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (emailErr) setEmailErr(null)
                          }}
                          disabled={submitting}
                          aria-invalid={emailErr ? 'true' : 'false'}
                          aria-describedby={emailErr ? 'pv-email-error' : undefined}
                          className={`block w-full ${MIN_TAP} rounded-xl border px-4 py-2.5 text-base text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 ${
                            emailErr
                              ? 'border-red-500/60 bg-red-500/[0.06] focus:ring-red-500/40'
                              : 'border-white/15 bg-white/[0.04] focus:border-emerald-400/60 focus:ring-emerald-500/40'
                          }`}
                        />
                        {emailErr && (
                          <p id="pv-email-error" className="text-xs text-red-300">
                            {emailErr}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={submitting}
                          className={`inline-flex w-full ${MIN_TAP} items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {submitting
                            ? es
                              ? 'Enviando…'
                              : 'Submitting…'
                            : es
                              ? 'Suscribirme al newsletter'
                              : 'Subscribe to newsletter'}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <Link
                    href="/pulse"
                    onClick={handleClose}
                    className={`inline-flex w-full ${MIN_TAP} items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10`}
                  >
                    {es ? 'Ver más consultas activas →' : 'See more active consultations →'}
                  </Link>
                )}
              </div>

              {/* Demoted share row */}
              <div className="px-5 py-4 border-t border-white/5">
                <p className="text-sm font-medium text-white">
                  {es ? 'Comparte tu voto' : 'Share your vote'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ShareBtn label="X" onClick={handleShareTwitter} />
                  <ShareBtn label="WhatsApp" onClick={handleShareWhatsApp} accent="#25D366" />
                  <ShareBtn label="Facebook" onClick={handleShareFacebook} accent="#1877F2" />
                  <ShareBtn
                    label={es ? 'Copiar enlace' : 'Copy link'}
                    onClick={handleCopy}
                    icon={<Share2 className="h-4 w-4" />}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setMoreShareOpen((v) => !v)}
                  aria-expanded={moreShareOpen}
                  aria-controls="post-vote-more-share"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${moreShareOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                  {moreShareOpen
                    ? es
                      ? 'Menos opciones'
                      : 'Fewer options'
                    : es
                      ? 'Más opciones de compartir'
                      : 'More share options'}
                </button>

                {moreShareOpen && (
                  <div
                    id="post-vote-more-share"
                    className="mt-3 grid grid-cols-2 gap-2"
                  >
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <ShareBtn
                        label={es ? 'Compartir…' : 'Share…'}
                        onClick={handleNative}
                        icon={<Share2 className="h-4 w-4" />}
                      />
                    )}
                    <ShareBtn
                      label={es ? 'Tarjeta' : 'Share card'}
                      onClick={handleDownloadCard}
                      icon={<ImageIcon className="h-4 w-4" />}
                    />
                    <ShareBtn
                      label={es ? 'Stories' : 'To Stories'}
                      onClick={handleShareStory}
                      icon={<Instagram className="h-4 w-4" />}
                    />
                    <ShareBtn
                      label={es ? 'Descargar Story' : 'Download Story'}
                      onClick={handleDownloadStory}
                      icon={<Download className="h-4 w-4" />}
                    />
                  </div>
                )}
              </div>

              {/* Tertiary close */}
              <div className="px-5 pb-5 pt-2 text-center">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
                >
                  {es ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function ShareBtn({
  label,
  onClick,
  accent,
  icon,
}: {
  label: string
  onClick: () => void
  accent?: string
  icon?: React.ReactNode
}) {
  const style = accent
    ? { color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}14` }
    : undefined
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`inline-flex ${MIN_TAP} items-center justify-center gap-2 rounded-xl border ${
        accent ? '' : 'border-white/15 bg-white/[0.04] text-white'
      } px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}
