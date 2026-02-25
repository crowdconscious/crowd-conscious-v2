'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Heart,
  ArrowLeft,
  Receipt,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/predictions', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/predictions/markets', label: 'Markets', icon: TrendingUp },
  { href: '/predictions/wallet', label: 'Wallet', icon: Wallet },
  { href: '/predictions/trades', label: 'My Trades', icon: Receipt },
  { href: '/predictions/fund', label: 'Conscious Fund', icon: Heart },
]

export default function PredictionsShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isGatePage = pathname === '/predictions/gate'

  // Gate page: minimal layout, no sidebar
  if (isGatePage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
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

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Main App
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-10">
        <h1 className="font-bold text-white">Predictions</h1>
        <Link
          href="/dashboard"
          className="text-sm text-emerald-400"
        >
          Main App
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
