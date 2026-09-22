'use client'

import { LiveActionCard, type LiveActionCardMarket } from '@/components/landing/LiveActionCard'

type Props = {
  locale: 'es' | 'en'
  market: LiveActionCardMarket | null
  question: string
}

/**
 * Block 1 of the homepage (Phase 1).
 * One live action card replaces the fund thermometer above the fold.
 * Fund chrome remains below the fold on the landing page.
 */
export function LandingHeroBlock({ locale, market, question }: Props) {
  return <LiveActionCard locale={locale} market={market} question={question} />
}
