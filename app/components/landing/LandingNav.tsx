'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X, Download, ChevronDown } from 'lucide-react'
import Logo from '@/components/Logo'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLiveNavBadge } from '@/hooks/useLiveNavBadge'
import { CompactFundThermometer } from '@/components/fund/FundThermometer'
import { getPodcastCopy } from '@/lib/i18n/podcast'

/**
 * Canonical logged-out primary nav (locale-aware):
 *   Primary (always visible on desktop): Votar · Resultados · (Reportar) · Evaluar
 *   Secondary (Más menu on desktop): Para marcas · Para creadores · Blog · Podcast · Acerca
 *
 * Verb-first chrome (Phase 0): primary action labels lead with verbs;
 * product nouns (Pulse, Señales, Lugares) stay on secondary taxonomy / after
 * first action. Routes stay `/pulse`, `/signals`, `/locations`, `/para-marcas`.
 */
const NAV = {
  es: {
    pulse: 'Votar',
    resultados: 'Resultados',
    signals: 'Reportar',
    signalsBeta: 'Beta',
    evaluar: 'Evaluar',
    paraMarcas: 'Para marcas',
    creators: 'Para creadores',
    blog: 'Blog',
    about: 'Acerca',
    more: 'Más',
    live: 'En Vivo',
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
    downloadApp: 'Descargar la app',
    androidSoon: 'Android próximamente',
  },
  en: {
    pulse: 'Vote',
    resultados: 'Results',
    signals: 'Report',
    signalsBeta: 'Beta',
    evaluar: 'Evaluate',
    paraMarcas: 'For brands',
    creators: 'For creators',
    blog: 'Blog',
    about: 'About',
    more: 'More',
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

type NavItem = {
  href: string
  label: string
  emphasize?: boolean
  badge?: string
}

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

function NavLink({
  item,
  onClick,
  className = '',
}: {
  item: NavItem
  onClick?: () => void
  className?: string
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-1.5 font-medium transition-colors ${
        item.emphasize
          ? 'text-emerald-400/95 hover:text-emerald-300'
          : 'text-slate-400 hover:text-white'
      } ${className}`}
    >
      <span>{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function MoreMenu({
  label,
  items,
}: {
  label: string
  items: NavItem[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[44px] items-center gap-1 font-medium text-slate-400 transition-colors hover:text-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-[#2d3748] bg-[#0f1419]/98 py-1 shadow-lg backdrop-blur-md"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
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

  const primary: NavItem[] = [
    { href: '/pulse', label: nav.pulse, emphasize: true },
    { href: '/pulse/results', label: nav.resultados },
    ...(SIGNALS_ENABLED
      ? [{ href: '/signals', label: nav.signals, badge: nav.signalsBeta }]
      : []),
    { href: '/locations', label: nav.evaluar },
  ]

  const secondary: NavItem[] = [
    { href: '/para-marcas', label: nav.paraMarcas },
    { href: '/creators', label: nav.creators },
    { href: '/blog', label: nav.blog },
    { href: '/podcast', label: getPodcastCopy(language).navLabel },
    { href: '/about', label: nav.about },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${navBg}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <div className="flex h-20 items-center gap-4 md:gap-6">
          <Logo size="nav" linkTo="/" />

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-6 lg:gap-8 md:flex">
            {primary.map((item) => (
              <NavLink key={item.href} item={item} className="text-sm lg:text-base" />
            ))}
            <MoreMenu label={nav.more} items={secondary} />
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-2 lg:gap-3 md:flex">
            <LiveBadge liveCount={liveCount} label={nav.live} />
            <CompactFundThermometer locale={language} />
            <LanguageSwitcherSimple />
            <a
              href="/app"
              title={nav.androidSoon}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 lg:px-3"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="hidden xl:inline">{nav.downloadApp}</span>
              <span className="xl:hidden">App</span>
            </a>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {nav.signIn}
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              {nav.signUp}
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="ml-auto p-2 text-slate-400 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#2d3748] bg-[#0f1419]/98 backdrop-blur-md md:hidden">
          <div className="space-y-1 px-4 py-4">
            <div className="flex items-center justify-between gap-2 py-2">
              <LanguageSwitcherSimple />
              <div className="flex items-center gap-2">
                <CompactFundThermometer locale={language} />
                <LiveBadge liveCount={liveCount} label={nav.live} />
              </div>
            </div>
            {primary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                onClick={() => setMobileOpen(false)}
                className="flex w-full py-3"
              />
            ))}
            <div className="my-2 border-t border-[#2d3748]" />
            {secondary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                onClick={() => setMobileOpen(false)}
                className="flex w-full py-3 text-sm"
              />
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
              className="block min-h-[44px] py-3 font-medium text-emerald-400 hover:text-emerald-300"
            >
              {nav.signUp}
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
