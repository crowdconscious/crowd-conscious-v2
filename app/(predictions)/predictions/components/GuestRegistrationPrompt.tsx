'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { setPendingVote } from '@/lib/guest-vote-storage'
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
    body: 'Tu opinión ya cuenta para la comunidad. Crea tu cuenta para conservar tu XP, ver tu racha y aparecer en el ranking.',
    cta: 'Crear cuenta gratis',
    dismiss: 'Seguir votando sin cuenta →',
  },
  en: {
    heading: 'Your vote shifted the consensus',
    body: 'Your opinion already counts for the community. Create an account to keep your XP, track your streak, and show up on the leaderboard.',
    cta: 'Create a free account',
    dismiss: 'Keep voting without an account →',
  },
} as const

/**
 * Full-screen prompt after anonymous vote: signup to claim XP on the existing market_votes row.
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-reg-heading"
        >
          <motion.div
            className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
          >
            <h2 id="guest-reg-heading" className="text-2xl font-bold text-white mb-3">
              {t.heading}
            </h2>
            <p className="text-slate-400 text-base mb-8 leading-relaxed">{t.body}</p>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-colors mb-4"
            >
              {t.cta}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-500 hover:text-slate-300 text-sm underline underline-offset-2"
            >
              {t.dismiss}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
