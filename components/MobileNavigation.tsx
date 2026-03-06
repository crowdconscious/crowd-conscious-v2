'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'

export default function MobileNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { path: '/predictions', icon: '🏠', label: 'Dashboard' },
    { path: '/predictions/markets', icon: '📊', label: 'Markets' },
    { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { path: '/profile', icon: '👤', label: 'Profile' },
  ]

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut()
    router.push('/')
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`
              flex flex-col items-center justify-center py-2 px-2 flex-1 transition-colors
              ${pathname === item.path ? 'text-emerald-400' : 'text-slate-500'}
            `}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center justify-center py-2 px-2 flex-1 text-slate-500 hover:text-red-400 transition-colors"
        >
          <span className="text-xl mb-0.5">🚪</span>
          <span className="text-xs font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
