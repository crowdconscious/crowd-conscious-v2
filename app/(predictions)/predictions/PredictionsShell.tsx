'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  TrendingUp,
  Heart,
  ArrowLeft,
  Receipt,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/predictions', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/predictions/markets', label: 'Markets', icon: TrendingUp },
  { href: '/predictions/insights', label: 'AI Insights', icon: Sparkles },
  { href: '/predictions/trades', label: 'My Predictions', icon: Receipt },
  { href: '/predictions/fund', label: 'Conscious Fund', icon: Heart },
]

export default function PredictionsShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar - desktop only */}
      <aside className="w-64 border-r border-slate-800 flex flex-col flex-shrink-0 hidden md:flex">
        <div className="p-4 border-b border-slate-800">
          <h1 className="font-bold text-lg text-white">Collective Consciousness</h1>
          <p className="text-xs text-slate-400 mt-0.5">Predictions</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {isAdmin && (
          <div className="px-4 pb-2">
            <Link
              href="/predictions/admin/resolve"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === '/predictions/admin/resolve'
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Resolve Markets
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Profile & Settings
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
        <h1 className="font-bold text-white">Predictions</h1>
        <Link
          href="/profile"
          className="text-sm text-emerald-400"
        >
          Profile
        </Link>
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
              <div>
                <h1 className="font-bold text-lg text-white">Collective Consciousness</h1>
                <p className="text-xs text-slate-400 mt-0.5">Predictions</p>
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
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
              {isAdmin && (
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
                  Resolve Markets
                </Link>
              )}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <Link
                href="/profile"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Profile & Settings
              </Link>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
