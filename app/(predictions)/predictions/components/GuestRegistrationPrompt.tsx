'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { setPendingVote } from '@/lib/guest-vote-storage'

interface GuestRegistrationPromptProps {
  open: boolean
  marketId: string
  outcomeId: string
  confidence: number
  /** yes | no for binary markets (included in signup URL) */
  voteYesNo: 'yes' | 'no' | null
  onDismiss: () => void
}

/**
 * Full-screen prompt after anonymous vote: drive signup with query params + pending vote in sessionStorage.
 */
export function GuestRegistrationPrompt({
  open,
  marketId,
  outcomeId,
  confidence,
  voteYesNo,
  onDismiss,
}: GuestRegistrationPromptProps) {
  const router = useRouter()

  const handleCreateAccount = () => {
    setPendingVote({
      marketId,
      outcomeId,
      confidence,
      vote: voteYesNo ?? undefined,
    })
    const params = new URLSearchParams()
    params.set('market', marketId)
    params.set('confidence', String(confidence))
    params.set('outcome', outcomeId)
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
              ¿Quieres ver cómo vota la multitud?
            </h2>
            <p className="text-slate-400 text-base mb-8 leading-relaxed">
              Crea tu cuenta gratis para ver los resultados completos, ganar XP y seguir prediciendo.
            </p>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-colors mb-4"
            >
              Crear cuenta gratis
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-500 hover:text-slate-300 text-sm underline underline-offset-2"
            >
              Continuar sin cuenta →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
