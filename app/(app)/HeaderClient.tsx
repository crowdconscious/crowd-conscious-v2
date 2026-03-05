'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedButton } from '@/components/ui/UIComponents'
import { XPBadge } from '@/components/gamification/XPBadge'

interface HeaderClientProps {
  user: any
}

export default function HeaderClient({ user }: HeaderClientProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Main Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CC</span>
              </div>
              <span className="font-bold text-xl text-white">
                Crowd Conscious
              </span>
            </Link>

            {/* Main Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/predictions"
                className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/predictions/markets" 
                className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Markets
              </Link>
              <Link 
                href="/leaderboard" 
                className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Leaderboard
              </Link>
              <Link 
                href="/predictions/fund" 
                className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Fund
              </Link>
              <Link 
                href="/achievements" 
                className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Achievements
              </Link>
            </nav>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-4">
            {/* XP Badge */}
            <div className="hidden md:block">
              <XPBadge variant="compact" />
            </div>
            
            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="hidden lg:block text-right">
                <div className="text-sm font-medium text-white">
                  {userProfile?.full_name || user.email}
                </div>
                <div className="text-xs text-slate-400">
                  User
                </div>
              </div>

              {/* Profile Picture */}
              <Link href="/profile">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-slate-700">
                    <span className="text-emerald-400 font-medium">
                      {userProfile?.full_name?.[0] || user.email[0]}
                    </span>
                  </div>
                )}
              </Link>

              {/* Settings & Logout */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/settings">
                  <AnimatedButton variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    ⚙️
                  </AnimatedButton>
                </Link>
                <AnimatedButton 
                  onClick={handleSignOut}
                  variant="ghost" 
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Sign Out
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}