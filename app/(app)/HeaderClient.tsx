'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { supabaseClient } from '@/lib/supabase-client'
import { XPBadge } from '@/components/gamification/XPBadge'
import { NotificationsBell } from '@/app/(predictions)/predictions/components/NotificationsBell'
import { useLiveNavBadge } from '@/hooks/useLiveNavBadge'

interface HeaderClientProps {
  user: any
}

export default function HeaderClient({ user }: HeaderClientProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()
  const { liveCount } = useLiveNavBadge()

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
            <Logo size="sidebar" linkTo="/predictions" className="shrink-0" />

            {/* Main Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/predictions"
                className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/live"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 font-medium transition-colors"
              >
                Live
                {liveCount > 0 && (
                  <span className="relative flex h-2 w-2" aria-label="Live">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                )}
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
          <div className="flex items-center gap-2 sm:gap-3">
            {/* XP Badge - no animation to avoid blinking */}
            <div className="hidden md:block">
              <XPBadge variant="compact" animated={false} />
            </div>

            <NotificationsBell />

            {/* Profile avatar */}
            <Link href="/profile" className="shrink-0">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border border-slate-600"
                />
              ) : (
                <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center border border-slate-600">
                  <span className="text-emerald-400 text-sm font-medium">
                    {userProfile?.full_name?.[0] || user.email?.[0] || '?'}
                  </span>
                </div>
              )}
            </Link>

            {/* Settings & Sign Out - always visible */}
            <div className="flex items-center gap-1">
              <Link
                href="/settings"
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}