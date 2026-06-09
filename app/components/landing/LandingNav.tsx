'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Download } from 'lucide-react'
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
    signals: 'Señales',
    signalsBeta: 'Beta',
    paraMarcas: 'Para marcas',
    blog: 'Blog',
    about: 'Acerca',
    live: 'En Vivo',
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
    downloadApp: 'Descargar la app',
    androidSoon: 'Android próximamente',
  },
  en: {
    pulse: 'Pulse',
    signals: 'Signals',
    signalsBeta: 'Beta',
    paraMarcas: 'For brands',
    blog: 'Blog',
    about: 'About',
    live: 'Live',
    signIn: 'Sign in',
    signUp: 'Create account',
    downloadApp: 'Download the app',
    androidSoon: 'Android coming soon',
  },
} as const

// Read at module init — the flag is set at build time on Vercel so this
// matches what the page-level routes return (404 when off).
const SIGNALS_ENABLED = process.env.NEXT_PUBLIC_SIGNALS_ENABLED === 'true'

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

  const primary: Array<{
    href: string
    label: string
    emphasize?: boolean
    badge?: string
  }> = [
    { href: '/pulse', label: nav.pulse, emphasize: true },
    ...(SIGNALS_ENABLED
      ? [{ href: '/signals', label: nav.signals, badge: nav.signalsBeta }]
      : []),
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
                className={`min-h-[44px] inline-flex items-center gap-1.5 font-medium transition-colors ${
                  item.emphasize
                    ? 'text-emerald-400/95 hover:text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <LiveBadge liveCount={liveCount} label={nav.live} />
            <CompactFundThermometer locale={language} />
            <LanguageSwitcherSimple />
            <a
              href="/app"
              title={nav.androidSoon}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <Download className="h-4 w-4" />
              <span>{nav.downloadApp}</span>
            </a>
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
                className={`flex min-h-[44px] items-center gap-2 py-3 font-medium ${
                  item.emphasize
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            <a
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="mt-1 flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 font-medium text-emerald-300"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{nav.downloadApp}</span>
              <span className="ml-auto text-xs font-normal text-slate-500">
                {nav.androidSoon}
              </span>
            </a>
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
