'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, ListOrdered, Mail, X } from 'lucide-react'
import { setPendingVote } from '@/lib/guest-vote-storage'
import { dismissAnonSoftGate } from '@/lib/anon-vote-tracker'
import { useLocale } from '@/lib/i18n/useLocale'

interface GuestRegistrationPromptProps {
  open: boolean
  marketId: string
  outcomeId: string
  confidence: number
  voteYesNo: 'yes' | 'no' | null
  guestId: string
  onDismiss: () => void
}

const COPY = {
  es: {
    heading: 'Tu voto cambió el consenso',
    body: 'Ya cuenta para la comunidad. Crea tu cuenta gratuita para conservar tu XP, tu racha y tu lugar en el ranking.',
    benefits: [
      { icon: Trophy, title: 'Gana XP', description: 'Acumula puntos por cada voto acertado.' },
      { icon: Flame, title: 'Mantén tu racha', description: 'Vota cada día para desbloquear recompensas.' },
      { icon: ListOrdered, title: 'Aparece en el ranking', description: 'Compite con la comunidad y gana medallas.' },
    ],
    ctaPrimary: 'Crear cuenta gratis',
    newsletterTitle: '¿Solo quieres el resumen?',
    newsletterBody: 'Recibe nuestro análisis semanal sin crear cuenta.',
    newsletterPlaceholder: 'tucorreo@ejemplo.com',
    newsletterCta: 'Suscribirme',
    newsletterLoading: 'Enviando…',
    newsletterSuccess: '¡Listo! Te enviaremos el próximo análisis.',
    newsletterError: 'No pudimos registrar tu correo. Intenta de nuevo.',
    dismiss: 'Seguir votando sin cuenta',
    closeLabel: 'Cerrar',
  },
  en: {
    heading: 'Your vote shifted the consensus',
    body: 'Your opinion already counts. Create your free account to keep your XP, streak and spot on the leaderboard.',
    benefits: [
      { icon: Trophy, title: 'Earn XP', description: 'Score points for every prediction you make.' },
      { icon: Flame, title: 'Keep your streak', description: 'Vote every day to unlock rewards.' },
      { icon: ListOrdered, title: 'Show up on the leaderboard', description: 'Compete with the community and earn badges.' },
    ],
    ctaPrimary: 'Create a free account',
    newsletterTitle: 'Just want the recap?',
    newsletterBody: 'Get our weekly analysis, no account required.',
    newsletterPlaceholder: 'you@example.com',
    newsletterCta: 'Subscribe',
    newsletterLoading: 'Sending…',
    newsletterSuccess: "You're in. We'll send the next analysis.",
    newsletterError: "Couldn't save your email. Please try again.",
    dismiss: 'Keep voting without an account',
    closeLabel: 'Close',
  },
} as const

/**
 * Full-screen prompt after an anonymous vote: invite the user to either
 * create an account (claims the existing market_votes row via setPendingVote)
 * or subscribe to the newsletter (softer, email-only conversion).
 */
export function GuestRegistrationPrompt({
  open,
  marketId,
  outcomeId,
  confidence,
  voteYesNo,
  guestId,
  onDismiss,
}: GuestRegistrationPromptProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = COPY[locale === 'en' ? 'en' : 'es']

  const [email, setEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  const handleCreateAccount = () => {
    setPendingVote({
      marketId,
      outcomeId,
      confidence,
      vote: voteYesNo ?? undefined,
      guestId,
    })
    const params = new URLSearchParams()
    params.set('market', marketId)
    params.set('confidence', String(confidence))
    params.set('outcome', outcomeId)
    params.set('guest_id', guestId)
    if (voteYesNo) params.set('vote', voteYesNo)
    router.push(`/signup?${params.toString()}`)
  }

  const handleDismiss = () => {
    dismissAnonSoftGate()
    onDismiss()
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setNewsletterStatus('error')
      return
    }
    setNewsletterStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: 'anon_vote_gate',
          language: locale === 'en' ? 'en' : 'es',
        }),
      })
      if (!res.ok) throw new Error('subscribe failed')
      setNewsletterStatus('success')
    } catch {
      setNewsletterStatus('error')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-cc-bg/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-reg-heading"
        >
          <motion.div
            className="relative my-8 w-full max-w-lg rounded-2xl border border-cc-border bg-cc-card p-6 shadow-2xl sm:p-8"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
          >
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t.closeLabel}
              className="absolute right-4 top-4 rounded-full p-2 text-cc-text-secondary transition-colors hover:bg-white/5 hover:text-cc-text-primary focus:outline-none focus:ring-2 focus:ring-cc-accent/40"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cc-accent/15 text-cc-accent">
                <Trophy className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2
                id="guest-reg-heading"
                className="text-2xl font-bold text-cc-text-primary"
              >
                {t.heading}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cc-text-secondary">
                {t.body}
              </p>
            </div>

            <ul className="mt-6 space-y-3" aria-label="Benefits">
              {t.benefits.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="flex items-start gap-3 rounded-xl border border-cc-border/70 bg-cc-bg/60 p-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cc-accent/10 text-cc-accent">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-cc-text-primary">{title}</p>
                    <p className="text-xs text-cc-text-secondary">{description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleCreateAccount}
              className="mt-6 w-full rounded-xl bg-cc-accent py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/10 transition-colors hover:bg-cc-accent-hover focus:outline-none focus:ring-2 focus:ring-cc-accent/50 focus:ring-offset-2 focus:ring-offset-cc-card"
            >
              {t.ctaPrimary}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-cc-border/70" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-cc-card px-3 text-xs uppercase tracking-wider text-cc-text-muted">
                  {locale === 'es' ? 'o' : 'or'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-cc-border/70 bg-cc-bg/60 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-cc-text-secondary">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-cc-text-primary">
                    {t.newsletterTitle}
                  </p>
                  <p className="mt-1 text-xs text-cc-text-secondary">
                    {t.newsletterBody}
                  </p>
                </div>
              </div>

              {newsletterStatus === 'success' ? (
                <p
                  role="status"
                  className="mt-3 rounded-lg border border-cc-accent/40 bg-cc-accent/10 px-3 py-2 text-center text-sm font-medium text-cc-accent"
                >
                  {t.newsletterSuccess}
                </p>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="guest-reg-email" className="sr-only">
                    {t.newsletterPlaceholder}
                  </label>
                  <input
                    id="guest-reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (newsletterStatus === 'error') setNewsletterStatus('idle')
                    }}
                    placeholder={t.newsletterPlaceholder}
                    className="flex-1 rounded-lg border border-cc-border bg-cc-bg px-3 py-2.5 text-sm text-cc-text-primary placeholder:text-cc-text-muted focus:border-cc-accent/60 focus:outline-none focus:ring-2 focus:ring-cc-accent/20"
                    disabled={newsletterStatus === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading' || !email.trim()}
                    className="whitespace-nowrap rounded-lg border border-cc-border bg-white/5 px-4 py-2.5 text-sm font-semibold text-cc-text-primary transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    {newsletterStatus === 'loading' ? t.newsletterLoading : t.newsletterCta}
                  </button>
                </form>
              )}

              {newsletterStatus === 'error' && (
                <p className="mt-2 text-xs text-rose-400">{t.newsletterError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-5 block w-full text-center text-xs text-cc-text-muted underline-offset-2 transition-colors hover:text-cc-text-secondary hover:underline"
            >
              {t.dismiss}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
