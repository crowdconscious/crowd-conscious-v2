'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, TrendingUp, Trophy, User, LogOut, Bell, Radio } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase-client'
import { useLiveNavBadge } from '@/hooks/useLiveNavBadge'

export default function MobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { liveCount } = useLiveNavBadge()

  const navItems = [
    { path: '/predictions', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/live', icon: Radio, label: 'Live' },
    { path: '/predictions/markets', icon: TrendingUp, label: 'Markets' },
    { path: '/predictions/notifications', icon: Bell, label: 'Alerts' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut()
    router.push('/')
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f1419] border-t border-[#2d3748] z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/live'
              ? pathname === '/live' || pathname.startsWith('/live/')
              : pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                relative flex min-h-[44px] flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-colors
                ${isActive ? 'text-emerald-400' : 'text-slate-500'}
              `}
            >
              {item.path === '/live' && liveCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0f1419]" />
              )}
              <Icon className="h-5 w-5 mb-0.5 shrink-0" strokeWidth={2} />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 text-slate-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-5 w-5 mb-0.5 shrink-0" strokeWidth={2} />
          <span className="text-xs font-medium truncate">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
