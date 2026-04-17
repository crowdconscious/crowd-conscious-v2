'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X } from 'lucide-react'
import { useCallback } from 'react'
import { dismissAnonSoftGate } from '@/lib/anon-vote-tracker'
import { createClient } from '@/lib/supabase-client'

type Props = {
  open: boolean
  alias: string | null
  voteCount: number
  xpTotal: number
  locale: 'es' | 'en'
  /** Where to send the user after they sign up. */
  nextPath?: string
  onClose: () => void
}

const GoogleIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path
      fill="#EA4335"
      d="M12 11v2.8h6.5c-.3 1.7-2 5-6.5 5-3.9 0-7.1-3.3-7.1-7.3S8.1 4.2 12 4.2c2.2 0 3.7.9 4.5 1.7l3.1-3C17.6 1.2 15.1 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"
    />
  </svg>
)

/**
 * Soft gate shown after the 3rd anonymous vote. NOT a hard gate — the
 * user can dismiss and keep voting anonymously. The goal is to capture
 * users who would otherwise churn when they clear cookies or change
 * browser.
 */
export function AnonymousSoftGate({
  open,
  alias,
  voteCount,
  xpTotal,
  locale,
  nextPath,
  onClose,
}: Props) {
  const router = useRouter()

  const dismiss = useCallback(() => {
    dismissAnonSoftGate()
    onClose()
  }, [onClose])

  const signUpWithGoogle = useCallback(async () => {
    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const next = nextPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
    } catch {
      // If OAuth errors out, fall through to the manual signup page.
      router.push('/signup')
    }
  }, [nextPath, router])

  const signUpManually = useCallback(() => {
    const next = nextPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
    router.push(`/signup?next=${encodeURIComponent(next)}`)
  }, [nextPath, router])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0f1419] p-6 text-center shadow-2xl"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-[#1a2029] hover:text-slate-300"
              aria-label={locale === 'es' ? 'Cerrar' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Trophy className="h-6 w-6" />
            </div>

            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
              {locale === 'es'
                ? `${voteCount} votos · ${xpTotal} XP acumulados`
                : `${voteCount} votes · ${xpTotal} XP earned`}
            </p>

            <h3 className="mt-2 text-xl font-bold text-white">
              {locale === 'es' ? '¿Quieres conservar tu progreso?' : 'Want to save your progress?'}
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              {locale === 'es'
                ? 'Crea una cuenta para desbloquear la clasificación, logros y tu racha de votos.'
                : 'Create an account to unlock the leaderboard, achievements, and your voting streak.'}
            </p>

            <button
              type="button"
              onClick={() => void signUpWithGoogle()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              <GoogleIcon />
              {locale === 'es' ? 'Continuar con Google' : 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={signUpManually}
              className="mt-2 w-full rounded-xl border border-[#2d3748] py-2.5 text-sm text-slate-300 hover:border-emerald-500/40"
            >
              {locale === 'es' ? 'Crear cuenta con email' : 'Sign up with email'}
            </button>

            <button
              type="button"
              onClick={dismiss}
              className="mt-3 text-xs text-slate-500 hover:text-slate-300"
            >
              {locale === 'es'
                ? `Seguir como ${alias ? `@${alias}` : 'invitado'} →`
                : `Keep going as ${alias ? `@${alias}` : 'guest'} →`}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
