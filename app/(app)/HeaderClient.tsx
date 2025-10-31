'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedButton } from '@/components/ui/UIComponents'

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
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Main Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CC</span>
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">
                Crowd Conscious
              </span>
            </Link>

            {/* Main Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/dashboard"
                className="text-slate-600 dark:text-slate-300 hover:text-teal-600 font-medium"
              >
                Dashboard
              </Link>
              <Link 
                href="/communities" 
                className="text-slate-600 dark:text-slate-300 hover:text-teal-600 font-medium"
              >
                Communities
              </Link>
              <Link 
                href="/discover" 
                className="text-slate-600 dark:text-slate-300 hover:text-teal-600 font-medium"
              >
                Discover
              </Link>
              <Link 
                href={
                  // Handle both boolean true and string "true" for is_corporate_user
                  (userProfile?.is_corporate_user === true || userProfile?.is_corporate_user === 'true') && userProfile?.corporate_role === 'admin'
                    ? '/corporate/dashboard'
                    : (userProfile?.is_corporate_user === true || userProfile?.is_corporate_user === 'true') && userProfile?.corporate_role === 'employee'
                    ? '/employee-portal/dashboard'
                    : '/concientizaciones'
                }
                className="text-slate-600 dark:text-slate-300 hover:text-purple-600 font-medium flex items-center gap-1"
              >
                🎓 Corporate Training
              </Link>
              {/* Admin Link */}
              {userProfile?.user_type === 'admin' && (
                <Link 
                  href="/admin" 
                  className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  ⚠️ Admin
                </Link>
              )}
            </nav>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-4">
            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="hidden lg:block text-right">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {userProfile?.full_name || user.email}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  User
                </div>
              </div>

              {/* Profile Picture */}
              <Link href="/profile">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-600">
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                      {userProfile?.full_name?.[0] || user.email[0]}
                    </span>
                  </div>
                )}
              </Link>

              {/* Settings & Logout */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/settings">
                  <AnimatedButton variant="ghost" size="sm">
                    ⚙️
                  </AnimatedButton>
                </Link>
                <AnimatedButton 
                  onClick={handleSignOut}
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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