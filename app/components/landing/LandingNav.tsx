'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLiveNavBadge } from '@/hooks/useLiveNavBadge'
import { usePulseNavBadge } from '@/hooks/usePulseNavBadge'

/** Pulsing dot when ≥1 public live event; link label is always shown separately. */
function LiveNowIndicator({ liveCount }: { liveCount: number }) {
  if (liveCount <= 0) return null
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
    </span>
  )
}

const NAV = {
  es: {
    markets: 'Mercados',
    live: 'En Vivo',
    about: 'Acerca de',
    forSponsors: 'Para Patrocinadores',
    signIn: 'Iniciar Sesión',
    startPredicting: 'Empezar a Predecir',
    pulse: 'Pulse',
  },
  en: {
    markets: 'Markets',
    live: 'Live',
    about: 'About',
    forSponsors: 'For Sponsors',
    signIn: 'Sign In',
    startPredicting: 'Start Predicting',
    pulse: 'Pulse',
  },
}

export default function LandingNav() {
  const { language } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = NAV[language]
  const { liveCount } = useLiveNavBadge()
  const { pulseCount } = usePulseNavBadge()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navBg = scrolled ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800' : 'bg-transparent'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${navBg}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Logo size="nav" linkTo="/" />

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/markets"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              {nav.markets}
            </Link>
            <Link
              href="/live"
              className={`inline-flex min-h-[44px] items-center gap-2 font-medium transition-colors ${
                liveCount > 0
                  ? 'text-red-300 hover:text-red-200'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {nav.live}
              {liveCount > 0 && (
                <span className="relative flex h-2.5 w-2.5" aria-label="Live">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              )}
            </Link>
            {pulseCount > 0 && (
              <Link
                href="/pulse"
                className="inline-flex min-h-[44px] items-center font-medium text-emerald-400/95 transition-colors hover:text-emerald-300"
              >
                {nav.pulse}
              </Link>
            )}
            <Link
              href="/about"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              {nav.about}
            </Link>
            <Link
              href="/sponsor"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              {nav.forSponsors}
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcherSimple />
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              {nav.signIn}
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
            >
              {nav.startPredicting}
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-md">
          <div className="px-4 py-4 space-y-3">
            <div className="py-2">
              <LanguageSwitcherSimple />
            </div>
            <Link
              href="/markets"
              onClick={() => setMobileOpen(false)}
              className="block min-h-[44px] py-3 text-slate-400 hover:text-white"
            >
              {nav.markets}
            </Link>
            <Link
              href="/live"
              onClick={() => setMobileOpen(false)}
              className={`flex min-h-[44px] items-center gap-2 py-3 ${
                liveCount > 0 ? 'text-red-300 hover:text-red-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{nav.live}</span>
              <LiveNowIndicator liveCount={liveCount} />
            </Link>
            {pulseCount > 0 && (
              <Link
                href="/pulse"
                onClick={() => setMobileOpen(false)}
                className="block min-h-[44px] py-3 font-medium text-emerald-400 hover:text-emerald-300"
              >
                {nav.pulse}
              </Link>
            )}
            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              {nav.about}
            </Link>
            <Link
              href="/sponsor"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              {nav.forSponsors}
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-slate-400 hover:text-white"
            >
              {nav.signIn}
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block py-3 rounded-lg bg-emerald-500 text-white font-semibold text-center"
            >
              {nav.startPredicting}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
