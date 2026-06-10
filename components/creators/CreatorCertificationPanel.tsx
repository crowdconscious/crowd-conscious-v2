'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, CheckCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-client'
import { ValueBadgeRow } from '@/components/locations/ValueBadge'
import VoteForMeShareRow from '@/components/creators/VoteForMeShareRow'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import {
  creatorTier,
  CREATOR_SCORE_REVEAL_THRESHOLD,
  type CreatorTier,
} from '@/lib/creators/types'

type OutcomeRow = {
  id: string
  label: string
  sort_order: number | null
}

export type CreatorCertificationSummary = {
  conscious_score: number | null
  total_votes: number
  certified_at: string | null
  next_review_date: string | null
  why_conscious: string | null
  why_conscious_en: string | null
  craft: string | null
  craft_en: string | null
  city: string | null
  values: string[]
  current_market_id: string | null
}

function tierBadgeClass(tier: CreatorTier): string {
  if (tier === 'certified')
    return 'border-amber-400/60 bg-amber-400/10 text-amber-300'
  if (tier === 'community_verified')
    return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
  return 'border-slate-500/60 bg-transparent text-slate-300'
}

export function CreatorTierBadge({
  cert,
  locale,
}: {
  cert: Pick<CreatorCertificationSummary, 'conscious_score' | 'total_votes' | 'certified_at'>
  locale: CreatorLocale
}) {
  const t = getCreatorCopy(locale)
  const tier = creatorTier(cert)
  const label =
    tier === 'certified'
      ? t.certTierCertified
      : tier === 'community_verified'
        ? t.certTierCommunityVerified
        : t.certTierNominated
  const Icon = tier === 'certified' ? Award : CheckCircle
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tierBadgeClass(tier)}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
      {tier === 'certified' && cert.certified_at
        ? ` · ${t.certCertifiedSince} ${new Date(cert.certified_at).toLocaleDateString(
            locale === 'es' ? 'es-MX' : 'en-US',
            { month: 'long', year: 'numeric' }
          )}`
        : null}
    </span>
  )
}

/**
 * Certification block for /creators/[handle]: tier badge, score, values,
 * craft, and the community vote panel. Vote flow (incl. anonymous alias
 * modal) is adapted from components/locations/LocationDetailClient.
 */
export default function CreatorCertificationPanel({
  cert,
  outcomes,
  locale,
  ownerShare = null,
}: {
  cert: CreatorCertificationSummary
  outcomes: OutcomeRow[]
  locale: CreatorLocale
  /** Set when the viewer owns this profile — unlocks the "vota por mí" share row pre-reveal. */
  ownerShare?: { profileId: string; handle: string } | null
}) {
  const t = getCreatorCopy(locale)
  const [confidence, setConfidence] = useState(7)
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null)
  const [myVote, setMyVote] = useState<{
    outcome_label: string
    confidence: number
    outcome_id: string
  } | null>(null)
  const [editing, setEditing] = useState(false)
  const [showAnonVotePrompt, setShowAnonVotePrompt] = useState(false)
  const [showAliasModal, setShowAliasModal] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const [voteError, setVoteError] = useState<string | null>(null)

  useEffect(() => {
    if (!cert.current_market_id) return
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/predictions/markets/${cert.current_market_id}/my-vote`)
      const json = (await res.json()) as {
        vote: { outcome_id: string; confidence: number } | null
      }
      if (cancelled || !json.vote) return
      const o = outcomes.find((x) => x.id === json.vote!.outcome_id)
      setMyVote({
        outcome_id: json.vote.outcome_id,
        confidence: json.vote.confidence,
        outcome_label: o?.label ?? '',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [cert.current_market_id, outcomes])

  const yesId = outcomes[0]?.id
  const noId = outcomes[1]?.id

  const submit = async () => {
    if (!cert.current_market_id) return
    const outcomeId = choice === 'yes' ? yesId : choice === 'no' ? noId : null
    if (!outcomeId) return
    setSubmitting(true)
    setVoteError(null)
    try {
      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          market_id: cert.current_market_id,
          outcome_id: outcomeId,
          confidence,
          reasoning: reasoning.trim() || null,
        }),
      })
      const j = (await res.json()) as { error?: string; requiresAlias?: boolean }
      if (res.status === 401 && j.requiresAlias === true) {
        setShowAliasModal(true)
        return
      }
      if (!res.ok) {
        setVoteError(typeof j.error === 'string' ? j.error : t.certVoteFailed)
        return
      }
      const {
        data: { session },
      } = await createClient().auth.getSession()
      if (!session?.user) setShowAnonVotePrompt(true)
      setEditing(false)
      setChoice(null)
      setMyVote({
        outcome_id: outcomeId,
        confidence,
        outcome_label: outcomes.find((o) => o.id === outcomeId)?.label ?? '',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const joinAliasAndRetry = async (alias: string) => {
    const clean = alias.trim() || (locale === 'es' ? 'Invitado' : 'Guest')
    const sessionId = crypto.randomUUID()
    const res = await fetch('/api/live/join-anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ alias: clean, emoji: '🎯', session_id: sessionId }),
    })
    const j = (await res.json()) as { error?: string }
    if (!res.ok) {
      setVoteError(
        j.error ?? (locale === 'es' ? 'No se pudo guardar el alias' : 'Could not save alias')
      )
      return
    }
    setShowAliasModal(false)
    setAliasInput('')
    await submit()
  }

  const score = cert.conscious_score
  const votes = cert.total_votes ?? 0
  const needed = Math.max(0, CREATOR_SCORE_REVEAL_THRESHOLD - votes)
  const scoreRevealed = score != null && votes >= CREATOR_SCORE_REVEAL_THRESHOLD

  const why =
    locale === 'es'
      ? cert.why_conscious || cert.why_conscious_en
      : cert.why_conscious_en || cert.why_conscious

  const badgeClass =
    !scoreRevealed
      ? 'bg-slate-600'
      : score! >= 8
        ? 'bg-emerald-500'
        : score! >= 6
          ? 'bg-amber-500'
          : 'bg-slate-500'

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
          month: 'long',
          year: 'numeric',
        })
      : '—'

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`flex min-w-[5rem] flex-col items-center rounded-xl px-4 py-2 text-white ${badgeClass}`}
        >
          {scoreRevealed ? (
            <>
              <span className="text-2xl font-bold">{score!.toFixed(1)}</span>
              <span className="text-xs opacity-90">/10</span>
            </>
          ) : (
            <span className="text-sm text-white/90">—</span>
          )}
          <span className="mt-1 text-[10px] text-white/80">
            {votes} {t.certVotes}
          </span>
        </div>
        {!scoreRevealed && (
          <p className="flex items-center gap-2 text-sm text-amber-400/90">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t.certVotesToReveal(needed)}</span>
          </p>
        )}
      </div>

      {why ? <p className="mt-4 text-slate-200 leading-relaxed">{why}</p> : null}
      {cert.values.length > 0 ? (
        <ValueBadgeRow values={cert.values} locale={locale} size="sm" />
      ) : null}

      {ownerShare && !scoreRevealed ? (
        <div className="mt-6">
          <VoteForMeShareRow
            profileId={ownerShare.profileId}
            handle={ownerShare.handle}
            locale={locale}
            surface="creator_profile"
          />
        </div>
      ) : null}

      {cert.current_market_id && yesId && noId && (
        <div className="mt-6 rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">{t.certVoteTitle}</h2>
          {voteError ? (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {voteError}
            </p>
          ) : null}

          {myVote && !editing ? (
            <div className="space-y-4">
              <p className="text-slate-300">
                {t.certVoteYou}: {myVote.outcome_label} (
                {locale === 'es' ? 'certeza' : 'confidence'} {myVote.confidence}/10).
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-emerald-400 hover:text-emerald-300"
              >
                {t.certVoteChange}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setChoice('yes')}
                  className={`min-h-[48px] flex-1 rounded-xl border px-4 py-3 font-semibold transition-colors ${
                    choice === 'yes'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-[#2d3748] text-slate-300'
                  }`}
                >
                  {outcomes[0]?.label ?? 'Sí'}
                </button>
                <button
                  type="button"
                  onClick={() => setChoice('no')}
                  className={`min-h-[48px] flex-1 rounded-xl border px-4 py-3 font-semibold transition-colors ${
                    choice === 'no'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                      : 'border-[#2d3748] text-slate-300'
                  }`}
                >
                  {outcomes[1]?.label ?? 'No'}
                </button>
              </div>
              <p className="mb-2 text-sm text-slate-400">{t.certVoteConfidence}</p>
              <input
                type="range"
                min={1}
                max={10}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="mb-6 w-full accent-emerald-500"
              />
              <label className="mb-2 block text-sm text-slate-400">{t.certVoteWhy}</label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                rows={2}
                className="mb-4 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] p-3 text-sm text-white"
              />
              <button
                type="button"
                disabled={!choice || submitting}
                onClick={() => void submit()}
                className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {t.certVoteSubmit}
              </button>
            </>
          )}
        </div>
      )}

      {cert.next_review_date && (
        <p className="mt-4 text-center text-sm text-slate-500">
          {t.certNextReview}: {fmt(cert.next_review_date)}
        </p>
      )}

      <AnimatePresence>
        {showAliasModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-2xl"
            >
              <h3 className="mb-2 text-lg font-bold text-white">
                {locale === 'es' ? 'Elige un alias' : 'Choose an alias'}
              </h3>
              <p className="mb-4 text-sm text-gray-400">
                {locale === 'es'
                  ? 'Tu alias aparece junto a tu voto. Puedes cambiarlo después.'
                  : 'Your alias appears with your vote. You can change it later.'}
              </p>
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder={locale === 'es' ? 'Tu alias…' : 'Your alias…'}
                maxLength={20}
                autoFocus
                className="mb-4 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
              />
              {voteError ? (
                <p className="mb-3 text-center text-sm text-red-400">{voteError}</p>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void joinAliasAndRetry(locale === 'es' ? 'Invitado' : 'Guest')}
                  className="flex-1 rounded-lg border border-[#2d3748] py-2.5 text-sm text-gray-400"
                >
                  {locale === 'es' ? 'Continuar como Invitado' : 'Continue as Guest'}
                </button>
                <button
                  type="button"
                  onClick={() => void joinAliasAndRetry(aliasInput)}
                  className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  {locale === 'es' ? 'Confirmar' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnonVotePrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-[45] border-t border-[#2d3748] bg-[#1a2029] p-4 shadow-2xl md:p-5"
          >
            <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">
                  {locale === 'es' ? '¡Voto registrado!' : 'Vote recorded!'}
                </p>
                <p className="text-sm text-slate-400">
                  {locale === 'es'
                    ? 'Crea una cuenta para ganar XP y aparecer en la clasificación.'
                    : 'Create an account to earn XP and appear on the leaderboard.'}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link
                  href="/signup"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500 sm:flex-none"
                >
                  {locale === 'es' ? 'Registrarse' : 'Sign up'}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAnonVotePrompt(false)}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#2d3748] px-4 text-slate-300 hover:bg-[#0f1419] sm:flex-none"
                >
                  {locale === 'es' ? 'Cerrar' : 'Dismiss'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
