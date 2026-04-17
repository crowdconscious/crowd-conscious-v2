'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

type Props = {
  open: boolean
  /** Absolute change in consensus probability in percentage points, or null. */
  delta: number | null
  xpEarned: number
  alias: string | null
  locale: 'es' | 'en'
  onDismiss: () => void
}

/**
 * Inline confirmation shown right after an anonymous vote lands.
 * Auto-dismisses after ~4s; rendered fixed-bottom so it layers cleanly
 * on top of the prediction/location page it was triggered from.
 */
export function AnonymousVoteToast({ open, delta, xpEarned, alias, locale, onDismiss }: Props) {
  const deltaText =
    delta == null
      ? null
      : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`

  const headline =
    locale === 'es'
      ? deltaText
        ? `Tu voto movió el consenso ${deltaText}`
        : 'Voto registrado'
      : deltaText
        ? `Your vote moved the consensus ${deltaText}`
        : 'Vote recorded'

  const subline = alias
    ? locale === 'es'
      ? `+${xpEarned} XP guardados como @${alias}`
      : `+${xpEarned} XP saved as @${alias}`
    : locale === 'es'
      ? `+${xpEarned} XP guardados`
      : `+${xpEarned} XP saved`

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="anon-vote-toast"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="pointer-events-none fixed inset-x-0 bottom-4 z-[65] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <button
            type="button"
            onClick={onDismiss}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[#1a2029] px-4 py-3 text-left shadow-xl shadow-emerald-500/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <Check className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-white">{headline}</span>
              <span className="text-xs text-slate-400">{subline}</span>
            </span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
