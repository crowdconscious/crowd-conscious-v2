'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function MobileNavigation() {
  const pathname = usePathname()
  
  const navItems = [
    { path: '/predictions', icon: '🏠', label: 'Dashboard' },
    { path: '/predictions/markets', icon: '📊', label: 'Markets' },
    { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { path: '/profile', icon: '👤', label: 'Profile' }
  ]
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 safe-area-bottom">
      <div className="grid grid-cols-4 py-2 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`
              flex flex-col items-center justify-center py-2 px-1 transition-all duration-200
              ${pathname === item.path 
                ? 'text-emerald-400 scale-110' 
                : 'text-slate-500 hover:text-slate-300 hover:scale-105'
              }
            `}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
