'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Share2, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  downloadCard,
  shareToWhatsApp,
  trackShare,
} from '@/lib/share-utils'
import { trackPostVoteEvent } from '@/lib/post-vote-analytics'
import { trackUxEvent } from '@/lib/ux-overhaul-analytics'
import {
  buildRevealHeadline,
  canShowFullReveal,
  lowNRevealCopy,
  revealClosingLine,
  type RevealOutcome,
} from '@/lib/post-vote-reveal'
import { toDisplayPercentRounded } from '@/lib/probability-utils'

/**
 * Phase 1 post-vote reveal (§3.3).
 *
 * Full contrast when n ≥ 25: generated headline (3 cases), confidence-weighted
 * bars matching Results, optional reasons from other options, one share prompt,
 * closing line. Below 25: first-voices copy + notify CTA — never fake bars /
 * "0 votos". Real votes only (no sim).
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

export type PostVoteReason = {
  id: string
  reasoning: string
  confidence: number
  outcome_id: string
  /** Alcaldía when known; never a personal name in the reveal. */
  alcaldia?: string | null
}

export interface PostVoteScreenProps {
  isOpen: boolean
  marketId: string
  marketTitle: string
  votedOutcome: PostVoteOutcomeStat | null
  userType: 'guest' | 'registered'
  locale: 'es' | 'en'
  totalVotes?: number
  /** @deprecated Phase 1: XP is not the payoff. Ignored. */
  xpEarned?: number | null
  sponsorName?: string | null
  /** All outcomes for reveal bars (confidence-weighted shares). */
  allOutcomes?: PostVoteOutcomeStat[]
  /** Public reasons from other options (alcaldía + certainty). */
  otherReasons?: PostVoteReason[]
  onClose: () => void
}

const MIN_TAP = 'min-h-[44px]'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function PostVoteScreen({
  isOpen,
  marketId,
  marketTitle,
  votedOutcome,
  userType,
  locale,
  totalVotes = 0,
  sponsorName,
  allOutcomes = [],
  otherReasons = [],
  onClose,
}: PostVoteScreenProps) {
  const es = locale === 'es'
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const [email, setEmail] = useState('')
  const [emailErr, setEmailErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [subscribed, setSubscribed] = useState<null | { already: boolean }>(null)
  const [shareShown, setShareShown] = useState(false)

  const voteN = totalVotes
  const fullReveal = canShowFullReveal(voteN)

  const revealOutcomes: RevealOutcome[] = useMemo(() => {
    const source =
      allOutcomes.length > 0
        ? allOutcomes
        : votedOutcome
          ? [votedOutcome]
          : []
    return source.map((o) => ({
      id: o.outcomeId,
      label: o.label,
      probability: o.probability,
      avgConfidence: o.avgConfidence,
    }))
  }, [allOutcomes, votedOutcome])

  const headline = useMemo(
    () => buildRevealHeadline(revealOutcomes, votedOutcome?.outcomeId, locale),
    [revealOutcomes, votedOutcome?.outcomeId, locale]
  )

  const lowN = lowNRevealCopy(locale)
  const closing = revealClosingLine(locale)

  const reasons = useMemo(() => {
    if (!votedOutcome) return []
    return otherReasons
      .filter((r) => r.outcome_id !== votedOutcome.outcomeId && r.confidence >= 1)
      .slice(0, 3)
  }, [otherReasons, votedOutcome])

  // Spec: hide the block when thinner than 3 clean public reasons.
  const showReasons = reasons.length >= 3

  useEffect(() => {
    if (!isOpen) return
    setEmail('')
    setEmailErr(null)
    setSubmitting(false)
    setSubscribed(null)
    setShareShown(false)
  }, [isOpen, marketId, votedOutcome?.outcomeId])

  useEffect(() => {
    if (!isOpen) return
    trackUxEvent('reveal_shown', {
      surface: 'web',
      object_id: marketId,
      headline_case: fullReveal ? headline.case : 'low_n',
      vote_n: voteN,
    })
    trackUxEvent('action_completed', {
      surface: 'web',
      action_type: 'vote',
      object_id: marketId,
    })
    if (fullReveal && showReasons) {
      trackUxEvent('reasons_block_shown', {
        surface: 'web',
        object_id: marketId,
        reason_count: reasons.length,
      })
    }
  }, [isOpen, marketId, fullReveal, headline.case, voteN, showReasons, reasons.length])

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

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed) || trimmed.length > 254) {
      setEmailErr(es ? 'Correo inválido' : 'Invalid email')
      return
    }
    setEmailErr(null)
    setSubmitting(true)
    trackUxEvent('permission_prompted', {
      surface: 'web',
      type: 'notify_email',
      trigger_point: 'post_vote_low_n',
      object_id: marketId,
    })
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          source: `post_vote_reveal_${marketId}`,
          language: locale,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEmailErr(
          es
            ? 'No pudimos suscribirte. Intenta de nuevo.'
            : "We couldn't subscribe you. Please try again."
        )
        return
      }
      setSubscribed({ already: data?.already === true })
      trackUxEvent('permission_granted', {
        surface: 'web',
        type: 'notify_email',
        trigger_point: 'post_vote_low_n',
        object_id: marketId,
      })
      trackPostVoteEvent('newsletter_signup_post_vote', {
        marketId,
        userType,
        locale,
        alreadySubscribed: data?.already === true,
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

  const handleShareOnce = () => {
    if (shareShown) return
    setShareShown(true)
    trackUxEvent('reveal_share_tapped', {
      surface: 'web',
      object_id: marketId,
    })
    trackPostVoteEvent('share_click_post_vote', {
      marketId,
      userType,
      locale,
      channel: 'whatsapp',
    })
    trackShare({ type: 'market', marketId }, 'whatsapp', 'post_vote_reveal', 'link')
    shareToWhatsApp(marketId, marketTitle, sponsorName ?? null, locale, true)
  }

  const handleDownloadCard = () => {
    if (shareShown) return
    setShareShown(true)
    trackUxEvent('reveal_share_tapped', {
      surface: 'web',
      object_id: marketId,
    })
    trackShare({ type: 'market', marketId }, 'story_download', 'post_vote_reveal', 'png')
    void downloadCard(marketId, 'standard', locale)
  }

  const sortedBars = useMemo(
    () => [...revealOutcomes].sort((a, b) => b.probability - a.probability),
    [revealOutcomes]
  )

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
              <div className="relative px-5 pt-5 pb-3 border-b border-white/5">
                <div className="flex items-start justify-between gap-3">
                  <p
                    id="post-vote-title"
                    className="text-base font-semibold text-white leading-snug pr-2"
                  >
                    {fullReveal ? headline.text : lowN.headline}
                  </p>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={handleClose}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    aria-label={es ? 'Cerrar' : 'Close'}
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>
                {votedOutcome ? (
                  <p className="mt-2 text-sm text-slate-400">
                    {es ? 'Votaste:' : 'You voted:'}{' '}
                    <span className="text-emerald-300">{votedOutcome.label}</span>
                  </p>
                ) : null}
              </div>

              {fullReveal ? (
                <div className="px-5 py-4 space-y-4">
                  <div className="space-y-3">
                    {sortedBars.map((o) => {
                      const pct = toDisplayPercentRounded(o.probability)
                      const isYours = o.id === votedOutcome?.outcomeId
                      return (
                        <div key={o.id} className="space-y-1">
                          <div className="flex justify-between gap-2 text-sm">
                            <span
                              className={`min-w-0 leading-snug ${
                                isYours ? 'text-emerald-300 font-medium' : 'text-slate-200'
                              }`}
                            >
                              {o.label}
                            </span>
                            <span
                              className={`shrink-0 tabular-nums ${
                                isYours ? 'text-emerald-300' : 'text-slate-500'
                              }`}
                            >
                              {pct}%
                              {o.avgConfidence != null
                                ? ` · ${o.avgConfidence.toFixed(1)}/10`
                                : ''}
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className={`h-full rounded-full ${
                                isYours ? 'bg-emerald-500' : 'bg-white/20'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(pct, 2))}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-sm text-slate-300 leading-snug">{closing}</p>

                  {showReasons ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {es ? 'Por qué votaron distinto' : 'Why others voted differently'}
                      </p>
                      <ul className="mt-3 space-y-3">
                        {reasons.map((r) => (
                          <li key={r.id} className="border-l-2 border-emerald-500/30 pl-3">
                            <p className="text-sm text-slate-200">&ldquo;{r.reasoning}&rdquo;</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {[r.alcaldia?.trim() || (es ? 'CDMX' : 'Mexico City'), `${es ? 'certeza' : 'certainty'} ${r.confidence}/10`]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {!shareShown ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">
                        {es ? 'Comparte esta lectura' : 'Share this reading'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleShareOnce}
                          className={`inline-flex ${MIN_TAP} items-center justify-center gap-2 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-2 text-sm font-medium text-[#25D366]`}
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCard}
                          className={`inline-flex ${MIN_TAP} items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white`}
                        >
                          <Share2 className="h-4 w-4" />
                          {es ? 'Tarjeta' : 'Card'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {es ? 'Gracias por compartir.' : 'Thanks for sharing.'}
                    </p>
                  )}

                  <p className="text-xs text-slate-500 leading-snug">
                    {es
                      ? 'Instala la app para que te avisemos cuando esto se mueva.'
                      : 'Install the app so we can tell you when this moves.'}{' '}
                    <Link
                      href="/app"
                      className="text-emerald-400 hover:text-emerald-300"
                      onClick={handleClose}
                    >
                      {es ? 'Ver app' : 'Get the app'}
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-4">
                  <p className="text-sm text-slate-300 leading-snug">{lowN.body}</p>

                  {subscribed ? (
                    <div
                      role="status"
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center"
                    >
                      <p className="text-sm font-medium text-emerald-300">
                        {subscribed.already
                          ? es
                            ? '✓ Ya te avisaremos'
                            : '✓ You’re already on the list'
                          : es
                            ? '✓ Te avisamos'
                            : '✓ We’ll notify you'}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleNotify} noValidate>
                      <div className="space-y-2">
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
                          className={`block w-full ${MIN_TAP} rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40`}
                        />
                        {emailErr ? (
                          <p className="text-xs text-red-300">{emailErr}</p>
                        ) : null}
                        <button
                          type="submit"
                          disabled={submitting}
                          className={`inline-flex w-full ${MIN_TAP} items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-60`}
                        >
                          {submitting
                            ? es
                              ? 'Enviando…'
                              : 'Submitting…'
                            : lowN.notifyCta}
                        </button>
                      </div>
                    </form>
                  )}

                  <p className="text-xs text-slate-500 leading-snug">
                    {es
                      ? 'Instala la app para que te avisemos cuando esto se mueva.'
                      : 'Install the app so we can tell you when this moves.'}
                  </p>
                </div>
              )}

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
