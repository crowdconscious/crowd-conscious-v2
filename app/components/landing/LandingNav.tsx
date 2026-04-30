'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLiveNavBadge } from '@/hooks/useLiveNavBadge'
import { CompactFundThermometer } from '@/components/fund/FundThermometer'

/**
 * Canonical logged-out primary nav (4 items, locale-aware):
 *   Pulse · Para marcas · Blog · Acerca
 *
 * Pulse (consumer Pulse listing) is the emphasized slot; Para marcas is
 * the B2B landing (formerly the /pulse URL). Predicciones, Lugares, and
 * Fondo moved into the authed surface — they're reachable via /predictions
 * once logged in. Live is a compact pulsing badge that only appears when
 * a public live event is happening. Sponsor / Sponsors / Contact /
 * Markets live in the footer.
 */
const NAV = {
  es: {
    pulse: 'Pulse',
    paraMarcas: 'Para marcas',
    blog: 'Blog',
    about: 'Acerca',
    live: 'En Vivo',
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
  },
  en: {
    pulse: 'Pulse',
    paraMarcas: 'For brands',
    blog: 'Blog',
    about: 'About',
    live: 'Live',
    signIn: 'Sign in',
    signUp: 'Create account',
  },
} as const

function LiveBadge({ liveCount, label }: { liveCount: number; label: string }) {
  if (liveCount <= 0) return null
  return (
    <Link
      href="/live"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-red-300 transition-colors hover:text-red-200"
      aria-label={`${label} (${liveCount})`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span>{label}</span>
    </Link>
  )
}

export default function LandingNav() {
  const { language } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = NAV[language]
  const { liveCount } = useLiveNavBadge()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navBg = scrolled
    ? 'bg-[#0f1419]/95 backdrop-blur-md border-b border-[#2d3748]'
    : 'bg-[#0f1419] border-b border-[#2d3748]'

  const primary: Array<{ href: string; label: string; emphasize?: boolean }> = [
    { href: '/pulse', label: nav.pulse, emphasize: true },
    { href: '/para-marcas', label: nav.paraMarcas },
    { href: '/blog', label: nav.blog },
    { href: '/about', label: nav.about },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${navBg}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <Logo size="nav" linkTo="/" />

          <div className="hidden md:flex items-center gap-8">
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] inline-flex items-center font-medium transition-colors ${
                  item.emphasize
                    ? 'text-emerald-400/95 hover:text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <LiveBadge liveCount={liveCount} label={nav.live} />
            <CompactFundThermometer locale={language} />
            <LanguageSwitcherSimple />
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors font-medium text-sm"
            >
              {nav.signIn}
            </Link>
            <Link
              href="/signup"
              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium text-sm"
            >
              {nav.signUp}
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
        <div className="md:hidden border-t border-[#2d3748] bg-[#0f1419]/98 backdrop-blur-md">
          <div className="px-4 py-4 space-y-1">
            <div className="py-2 flex items-center justify-between gap-2">
              <LanguageSwitcherSimple />
              <div className="flex items-center gap-2">
                <CompactFundThermometer locale={language} />
                <LiveBadge liveCount={liveCount} label={nav.live} />
              </div>
            </div>
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block min-h-[44px] py-3 font-medium ${
                  item.emphasize
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block min-h-[44px] py-3 text-slate-400 hover:text-white"
            >
              {nav.signIn}
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className="block min-h-[44px] py-3 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {nav.signUp}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
