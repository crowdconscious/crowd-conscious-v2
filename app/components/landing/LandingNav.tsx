'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { useLanguage } from '@/contexts/LanguageContext'

const NAV = {
  es: { markets: 'Mercados', about: 'Acerca de', forSponsors: 'Para Patrocinadores', signIn: 'Iniciar Sesión', startPredicting: 'Empezar a Predecir' },
  en: { markets: 'Markets', about: 'About', forSponsors: 'For Sponsors', signIn: 'Sign In', startPredicting: 'Start Predicting' },
}

export default function LandingNav() {
  const { language } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = NAV[language]

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
          <Logo size="md" linkTo="/" />

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/markets"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              {nav.markets}
            </Link>
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
              className="block py-2 text-slate-400 hover:text-white"
            >
              {nav.markets}
            </Link>
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
