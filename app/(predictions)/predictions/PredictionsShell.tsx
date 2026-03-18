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
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import LanguageSwitcherSimple from '@/components/LanguageSwitcherSimple'
import { NotificationsBell } from './components/NotificationsBell'

const NAV_ITEMS_EN = [
  { href: '/predictions', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/predictions/markets', label: 'Markets', icon: TrendingUp },
  { href: '/predictions/trades', label: 'My Predictions', icon: Receipt },
  { href: '/predictions/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/predictions/inbox', label: 'Conscious Inbox', icon: Lightbulb },
  { href: '/predictions/fund', label: 'Conscious Fund', icon: Heart },
]
const NAV_ITEMS_ES = [
  { href: '/predictions', label: 'Panel', icon: LayoutDashboard },
  { href: '/predictions/markets', label: 'Mercados', icon: TrendingUp },
  { href: '/predictions/trades', label: 'Mis Predicciones', icon: Receipt },
  { href: '/predictions/leaderboard', label: 'Clasificación', icon: Trophy },
  { href: '/predictions/inbox', label: 'Buzón Consciente', icon: Lightbulb },
  { href: '/predictions/fund', label: 'Fondo Consciente', icon: Heart },
]

export default function PredictionsShell({
  children,
  isAdmin = false,
  isAuthenticated = true,
  navCounts = { inboxPending: 0, activeMarkets: 0 },
}: {
  children: React.ReactNode
  isAdmin?: boolean
  isAuthenticated?: boolean
  navCounts?: { inboxPending: number; activeMarkets: number }
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar - desktop only */}
      <aside className="w-64 border-r border-slate-800 flex flex-col flex-shrink-0 hidden md:flex">
        <div className="p-4 border-b border-slate-800">
          <Logo size="sidebar" linkTo="/predictions" />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href
              || (item.href !== '/predictions' && pathname.startsWith(item.href + '/'))
            const badge = getBadgeForHref(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {badge != null && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {isAdmin && (
          <div className="px-4 pb-2 space-y-1">
            <Link
              href="/predictions/admin/create-market"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/create-market'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              {language === 'es' ? 'Panel de Agentes' : 'Agent Dashboard'}
            </Link>
            <Link
              href="/predictions/admin/sponsors"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/sponsors'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {language === 'es' ? 'Patrocinadores' : 'Sponsors'}
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            {isAuthenticated && <NotificationsBell />}
            <LanguageSwitcherSimple />
          </div>
          <Link
            href={isAuthenticated ? '/profile' : '/login'}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isAuthenticated
              ? (language === 'es' ? 'Perfil y Configuración' : 'Profile & Settings')
              : (language === 'es' ? 'Iniciar Sesión' : 'Sign In')}
          </Link>
        </div>
      </aside>

      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-20">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40 shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div onClick={closeMobileMenu} className="flex items-center">
                <Logo size="sidebar" linkTo="/predictions" />
              </div>
              <button
                onClick={closeMobileMenu}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href
                  || (item.href !== '/predictions' && pathname.startsWith(item.href + '/'))
                const badge = getBadgeForHref(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {badge != null && (
                      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                )
              })}
              {isAdmin && (
                <>
                  <Link
                    href="/predictions/admin/create-market"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/create-market'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
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
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    {language === 'es' ? 'Panel de Agentes' : 'Agent Dashboard'}
                  </Link>
                  <Link
                    href="/predictions/admin/sponsors"
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === '/predictions/admin/sponsors'
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    {language === 'es' ? 'Patrocinadores' : 'Sponsors'}
                  </Link>
                </>
              )}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                {isAuthenticated && <NotificationsBell />}
                <LanguageSwitcherSimple />
              </div>
              <Link
                href={isAuthenticated ? '/profile' : '/login'}
                onClick={closeMobileMenu}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
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
