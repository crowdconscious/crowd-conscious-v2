'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Logo from '@/components/Logo'
import {
  LayoutDashboard,
  TrendingUp,
  Heart,
  ArrowLeft,
  Receipt,
  Menu,
  X,
  ShieldCheck,
  Lightbulb,
  FileText,
  PlusCircle,
  Trophy,
  Bot,
  DollarSign,
  Bell,
  BarChart3,
  Radio,
  Activity,
  Ticket,
  Newspaper,
  PenLine,
  MapPin,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { NotificationsBell } from './components/NotificationsBell'

const NAV_ITEMS_EN = [
  { href: '/predictions', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/live', label: 'Live', icon: Radio },
  { href: '/predictions/notifications', label: 'Notifications', icon: Bell },
  { href: '/predictions/markets', label: 'Markets', icon: TrendingUp },
  { href: '/predictions/trades', label: 'My Predictions', icon: Receipt },
  { href: '/predictions/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/predictions/inbox', label: 'Conscious Inbox', icon: Lightbulb },
  { href: '/predictions/fund', label: 'Conscious Fund', icon: Heart },
  { href: '/blog', label: 'Blog', icon: Newspaper },
]
const NAV_ITEMS_ES = [
  { href: '/predictions', label: 'Panel', icon: LayoutDashboard },
  { href: '/live', label: 'En Vivo', icon: Radio },
  { href: '/predictions/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/predictions/markets', label: 'Mercados', icon: TrendingUp },
  { href: '/predictions/trades', label: 'Mis Predicciones', icon: Receipt },
  { href: '/predictions/leaderboard', label: 'Clasificación', icon: Trophy },
  { href: '/predictions/inbox', label: 'Buzón Consciente', icon: Lightbulb },
  { href: '/predictions/fund', label: 'Fondo Consciente', icon: Heart },
  { href: '/blog', label: 'Blog', icon: Newspaper },
]

export default function PredictionsShell({
  children,
  isAdmin = false,
  isAuthenticated = true,
  navCounts = { inboxPending: 0, activeMarkets: 0, liveNowCount: 0 },
}: {
  children: React.ReactNode
  isAdmin?: boolean
  isAuthenticated?: boolean
  navCounts?: { inboxPending: number; activeMarkets: number; liveNowCount: number }
}) {
  const pathname = usePathname()
  const { language } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = () => setMobileMenuOpen(false)
  const NAV_ITEMS = language === 'es' ? NAV_ITEMS_ES : NAV_ITEMS_EN

  const getBadgeForHref = (href: string) => {
    if (href === '/predictions/inbox' && navCounts.inboxPending > 0) return navCounts.inboxPending
    if (href === '/predictions/markets' && navCounts.activeMarkets > 0) return navCounts.activeMarkets
    return null
  }

  const showLivePulse = navCounts.liveNowCount > 0

  return (
    <div className="flex min-h-screen bg-cc-bg text-cc-text-primary">
      {/* Sidebar - desktop only */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-cc-border bg-cc-nav-bg md:flex">
        <div className="border-b border-cc-border p-4">
          <Logo size="sidebar" linkTo="/predictions" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/live'
                ? pathname === '/live' || pathname.startsWith('/live/')
                : pathname === item.href ||
                  (item.href !== '/predictions' && pathname.startsWith(item.href + '/'))
            const badge = getBadgeForHref(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-cc-text-primary'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {item.href === '/live' && showLivePulse ? (
                  <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-label="Live">
                    <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative h-2 w-2 rounded-full bg-red-500" />
                  </span>
                ) : badge != null ? (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {isAdmin && (
          <div className="px-4 pb-2 space-y-1">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500/90">
              {language === 'es' ? 'Administración' : 'Admin'}
            </p>
            <Link
              href="/predictions/intelligence"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/predictions/intelligence')
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {language === 'es' ? 'Centro de Inteligencia' : 'Intelligence Hub'}
            </Link>
            <Link
              href="/predictions/admin/create-market"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/create-market'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              {language === 'es' ? 'Crear Mercado' : 'Create Market'}
            </Link>
            <Link
              href="/predictions/admin/inbox"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/inbox'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              {language === 'es' ? 'Revisar Buzón' : 'Review Inbox'}
            </Link>
            <Link
              href="/predictions/admin/causes"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/causes'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <Heart className="w-4 h-4" />
              {language === 'es' ? 'Gestionar Causas' : 'Manage Causes'}
            </Link>
            <Link
              href="/predictions/admin/resolve"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/resolve'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {language === 'es' ? 'Resolver Mercados' : 'Resolve Markets'}
            </Link>
            <Link
              href="/predictions/admin/agents"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/agents'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <Bot className="w-4 h-4" />
              {language === 'es' ? 'Panel de Agentes' : 'Agent Dashboard'}
            </Link>
            <Link
              href="/predictions/admin/blog/create"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/predictions/admin/blog')
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <PenLine className="w-4 h-4" />
              {language === 'es' ? 'Escribir blog' : 'Write blog'}
            </Link>
            <Link
              href="/predictions/admin/sponsors"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/sponsors'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {language === 'es' ? 'Patrocinadores' : 'Sponsors'}
            </Link>
            <Link
              href="/predictions/admin/coupons"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/coupons'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <Ticket className="w-4 h-4" />
              {language === 'es' ? 'Cupones' : 'Coupons'}
            </Link>
            <Link
              href="/admin/locations"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/admin/locations')
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Locations
            </Link>
            <Link
              href="/predictions/pulse"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/pulse' || pathname.startsWith('/pulse/')
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
              }`}
            >
              <Activity className="w-4 h-4" />
              {language === 'es' ? 'Informes Pulse' : 'Pulse Reports'}
            </Link>
          </div>
        )}

        <div className="space-y-3 border-t border-cc-border p-4">
          <div className="flex items-center gap-2">
            {isAuthenticated && <NotificationsBell />}
            <LanguageSwitcherSimple />
          </div>
          <Link
            href={isAuthenticated ? '/profile' : '/login'}
            className="flex items-center gap-2 text-sm text-cc-text-secondary transition-colors hover:text-emerald-400"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAuthenticated
              ? (language === 'es' ? 'Perfil y Configuración' : 'Profile & Settings')
              : (language === 'es' ? 'Iniciar Sesión' : 'Sign In')}
          </Link>
        </div>
      </aside>

      {/* Mobile header with hamburger */}
      <div className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between border-b border-cc-border bg-cc-nav-bg px-4 md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="-ml-2 rounded-lg p-2 text-cc-text-secondary transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Logo size="sidebar" linkTo="/predictions" />
        <div className="flex items-center gap-2">
          {isAuthenticated && <NotificationsBell />}
          <LanguageSwitcherSimple />
          <Link
            href={isAuthenticated ? '/profile' : '/login'}
            className="text-sm text-emerald-400"
          >
            {isAuthenticated ? (language === 'es' ? 'Perfil' : 'Profile') : (language === 'es' ? 'Iniciar Sesión' : 'Sign In')}
          </Link>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <aside className="fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r border-cc-border bg-cc-nav-bg shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b border-cc-border p-4">
              <div onClick={closeMobileMenu} className="flex items-center">
                <Logo size="sidebar" linkTo="/predictions" />
              </div>
              <button
                onClick={closeMobileMenu}
                className="rounded-lg p-2 text-cc-text-secondary transition-colors hover:bg-gray-800 hover:text-white"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/live'
                    ? pathname === '/live' || pathname.startsWith('/live/')
                    : pathname === item.href ||
                      (item.href !== '/predictions' && pathname.startsWith(item.href + '/'))
                const badge = getBadgeForHref(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex min-h-[44px] items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-cc-text-primary'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {item.href === '/live' && showLivePulse ? (
                      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-label="Live">
                        <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    ) : badge != null ? (
                      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
              {isAdmin && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-500/90">
                    {language === 'es' ? 'Administración' : 'Admin'}
                  </p>
                  <Link
                    href="/predictions/intelligence"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname.startsWith('/predictions/intelligence')
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {language === 'es' ? 'Centro de Inteligencia' : 'Intelligence Hub'}
                  </Link>
                  <Link
                    href="/predictions/admin/create-market"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/create-market'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    {language === 'es' ? 'Crear Mercado' : 'Create Market'}
                  </Link>
                  <Link
                    href="/predictions/admin/inbox"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/inbox'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    {language === 'es' ? 'Revisar Buzón' : 'Review Inbox'}
                  </Link>
                  <Link
                    href="/predictions/admin/causes"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/causes'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    {language === 'es' ? 'Gestionar Causas' : 'Manage Causes'}
                  </Link>
                  <Link
                    href="/predictions/admin/resolve"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/resolve'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {language === 'es' ? 'Resolver Mercados' : 'Resolve Markets'}
                  </Link>
                  <Link
                    href="/predictions/admin/agents"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/agents'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    {language === 'es' ? 'Panel de Agentes' : 'Agent Dashboard'}
                  </Link>
                  <Link
                    href="/predictions/admin/blog/create"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname.startsWith('/predictions/admin/blog')
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <PenLine className="w-4 h-4" />
                    {language === 'es' ? 'Escribir blog' : 'Write blog'}
                  </Link>
                  <Link
                    href="/predictions/admin/sponsors"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/sponsors'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    {language === 'es' ? 'Patrocinadores' : 'Sponsors'}
                  </Link>
                  <Link
                    href="/predictions/admin/coupons"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/coupons'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    {language === 'es' ? 'Cupones' : 'Coupons'}
                  </Link>
                  <Link
                    href="/admin/locations"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname.startsWith('/admin/locations')
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Locations
                  </Link>
                  <Link
                    href="/predictions/pulse"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/pulse' || pathname.startsWith('/pulse/')
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-cc-text-secondary hover:bg-gray-800/50 hover:text-amber-400'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    {language === 'es' ? 'Informes Pulse' : 'Pulse Reports'}
                  </Link>
                </>
              )}
            </nav>

            <div className="space-y-3 border-t border-cc-border p-4">
              <div className="flex items-center gap-2">
                {isAuthenticated && <NotificationsBell />}
                <LanguageSwitcherSimple />
              </div>
              <Link
                href={isAuthenticated ? '/profile' : '/login'}
                onClick={closeMobileMenu}
                className="flex items-center gap-2 text-sm text-cc-text-secondary transition-colors hover:text-emerald-400"
              >
                <ArrowLeft className="w-4 h-4" />
                {isAuthenticated
                  ? (language === 'es' ? 'Perfil y Configuración' : 'Profile & Settings')
                  : (language === 'es' ? 'Iniciar Sesión' : 'Sign In')}
              </Link>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-auto">
        <motion.div
          key={pathname}
          className="p-4 md:p-6 lg:p-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
