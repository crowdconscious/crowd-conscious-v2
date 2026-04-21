'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { supabaseClient } from '@/lib/supabase-client'
import { XPBadge } from '@/components/gamification/XPBadge'
import { NotificationsBell } from '@/app/(predictions)/predictions/components/NotificationsBell'
import { useLiveNavBadge } from '@/hooks/useLiveNavBadge'
import { useLanguage } from '@/contexts/LanguageContext'
import { CompactFundThermometer } from '@/components/fund/FundThermometer'

/**
 * Authed primary nav (locale-aware) — mirrors the public spec but routes
 * Predicciones at the personal dashboard. Markets, Leaderboard, and
 * Achievements moved out of the primary slot (they live inside /predictions
 * and the profile menu, respectively).
 *
 * "Mis cuentas" is rendered conditionally when `hasSponsorAccounts` is true
 * (coupon redeemers, paid sponsors). Users with zero sponsor rows keep the
 * canonical 5-item layout.
 */
const NAV = {
  es: {
    dashboard: 'Panel',
    predictions: 'Predicciones',
    locations: 'Lugares',
    pulse: 'Pulse',
    fund: 'Fondo',
    myAccounts: 'Mis cuentas',
    live: 'En Vivo',
    settings: 'Configuración',
    signOut: 'Cerrar Sesión',
  },
  en: {
    dashboard: 'Dashboard',
    predictions: 'Predictions',
    locations: 'Places',
    pulse: 'Pulse',
    fund: 'Fund',
    myAccounts: 'My accounts',
    live: 'Live',
    settings: 'Settings',
    signOut: 'Sign Out',
  },
} as const

interface HeaderClientProps {
  user: any
  /** When true, render the "Mis cuentas" nav entry pointing to /sponsor-accounts.
   * Computed server-side in `app/(app)/layout.tsx` from a sponsor_accounts
   * count query so users without any sponsor rows see an unchanged UI. */
  hasSponsorAccounts?: boolean
}

export default function HeaderClient({ user, hasSponsorAccounts = false }: HeaderClientProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()
  const { liveCount } = useLiveNavBadge()
  const { language } = useLanguage()
  const nav = NAV[language]
  const primary: Array<{ href: string; label: string; emphasize?: boolean }> = [
    { href: '/predictions', label: nav.dashboard },
    { href: '/predictions/markets', label: nav.predictions },
    { href: '/locations', label: nav.locations },
    { href: '/pulse', label: nav.pulse, emphasize: true },
    { href: '/predictions/fund', label: nav.fund },
    ...(hasSponsorAccounts ? [{ href: '/sponsor-accounts', label: nav.myAccounts }] : []),
  ]

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
    <header className="bg-[#0f1419] border-b border-[#2d3748] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Main Nav */}
          <div className="flex items-center gap-8">
            <Logo size="sidebar" linkTo="/predictions" className="shrink-0" />

            {/* Main Navigation - Desktop (canonical 5 items) */}
            <nav className="hidden md:flex items-center gap-6">
              {primary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-[44px] inline-flex items-center font-medium transition-colors ${
                    item.emphasize
                      ? 'text-emerald-400/95 hover:text-emerald-300'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {liveCount > 0 && (
                <Link
                  href="/live"
                  className="inline-flex items-center gap-2 text-red-300 hover:text-red-200 font-medium transition-colors"
                  aria-label={`${nav.live} (${liveCount})`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  {nav.live}
                </Link>
              )}
            </nav>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* XP Badge - no animation to avoid blinking */}
            <div className="hidden md:block">
              <XPBadge variant="compact" animated={false} />
            </div>

            <CompactFundThermometer locale={language} />

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
                aria-label={nav.settings}
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
                {nav.signOut}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}