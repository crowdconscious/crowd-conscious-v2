'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import type { Database } from '@/types/database'
import { getMarketText } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const STORAGE_KEY = 'cc_onboarding_dismissed'

interface OnboardingOverlayProps {
  trendingMarkets: PredictionMarket[]
  onDismiss: () => void
}

export function OnboardingOverlay({ trendingMarkets, onDismiss }: OnboardingOverlayProps) {
  const locale = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onDismiss()
  }

  if (!mounted) return null

  const markets = trendingMarkets.slice(0, 3)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
          aria-hidden="true"
        />
        <motion.div
          className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Crowd Conscious!
          </h2>
          <p className="text-slate-400 mb-6">
            Make your first prediction to earn XP and climb the leaderboard.
          </p>

          <p className="text-sm font-medium text-slate-300 mb-3">Trending markets to try:</p>
          <div className="space-y-2 mb-6">
            {markets.map((m) => (
              <Link
                key={m.id}
                href={`/predictions/markets/${m.id}`}
                onClick={handleDismiss}
                className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-emerald-500/50 transition-colors group"
              >
                <span className="font-medium text-white truncate pr-2">{getMarketText(m, 'title', locale)}</span>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </Link>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              href="/predictions/markets"
              onClick={handleDismiss}
              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-center transition-colors"
            >
              Browse markets
            </Link>
            <button
              onClick={handleDismiss}
              className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function shouldShowOnboarding(
  hasPredictions: boolean,
  userId: string
): boolean {
  if (typeof window === 'undefined') return false
  if (hasPredictions) return false
  return !localStorage.getItem(STORAGE_KEY)
}
