'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { resetAnonVoteTracker } from '@/lib/anon-vote-tracker'

type Payload = { alias: string | null; transferredXp: number }

const COOKIE_NAME = 'cc_just_converted'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  const entries = document.cookie.split('; ')
  for (const entry of entries) {
    if (entry.startsWith(prefix)) return decodeURIComponent(entry.slice(prefix.length))
  }
  return null
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

/**
 * One-shot celebration banner shown after the auth callback has
 * converted an anonymous participant into a registered user. Reads a
 * short-lived, non-httpOnly cookie set in `app/auth/callback/route.ts`.
 */
export function ConversionCelebration() {
  const { language } = useLanguage()
  const locale = language
  const [payload, setPayload] = useState<Payload | null>(null)

  useEffect(() => {
    const raw = readCookie(COOKIE_NAME)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Payload
      setPayload(parsed)
      clearCookie(COOKIE_NAME)
      resetAnonVoteTracker()
    } catch {
      clearCookie(COOKIE_NAME)
    }
  }, [])

  useEffect(() => {
    if (!payload) return
    const timer = window.setTimeout(() => setPayload(null), 6000)
    return () => window.clearTimeout(timer)
  }, [payload])

  const xp = payload?.transferredXp ?? 0
  const alias = payload?.alias ?? null

  return (
    <AnimatePresence>
      {payload ? (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-emerald-500/40 bg-[#0f1419] px-4 py-3 shadow-xl shadow-emerald-500/20">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">
                {locale === 'es' ? '¡Bienvenido!' : 'Welcome!'}
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {xp > 0
                  ? locale === 'es'
                    ? `Transferimos ${xp} XP${alias ? ` de @${alias}` : ''} a tu cuenta.`
                    : `We transferred ${xp} XP${alias ? ` from @${alias}` : ''} to your account.`
                  : locale === 'es'
                    ? 'Tu cuenta está lista.'
                    : 'Your account is ready.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPayload(null)}
              className="ml-2 shrink-0 text-xs text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
