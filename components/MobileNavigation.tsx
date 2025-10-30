'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function MobileNavigation() {
  const pathname = usePathname()
  
  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/communities', icon: '🌍', label: 'Communities' },
    { path: '/concientizaciones', icon: '🎓', label: 'Training' },
    { path: '/profile', icon: '👤', label: 'Profile' }
  ]
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
      <div className="grid grid-cols-4 py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`
              flex flex-col items-center justify-center py-2 px-1 transition-all duration-200
              ${pathname === item.path 
                ? 'text-teal-600 scale-110' 
                : 'text-slate-500 hover:text-slate-700 hover:scale-105'
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
