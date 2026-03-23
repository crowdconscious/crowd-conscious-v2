'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, TrendingUp, Trophy, User, LogOut, Bell } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase-client'

export default function MobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { path: '/predictions', icon: LayoutDashboard, label: 'Dashboard' },
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-colors
                ${isActive ? 'text-emerald-400' : 'text-slate-500'}
              `}
            >
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
