'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientAuth } from '@/lib/auth'

/**
 * Smart Home Redirect
 * 
 * Redirects users to their appropriate dashboard based on their role:
 * - Corporate Admins → /corporate/dashboard
 * - Corporate Employees → /employee-portal/dashboard
 * - Regular Users → /communities
 * - Not logged in → Landing page (stays on /)
 * 
 * This prevents users from being sent to landing pages after logging in
 */
export default function SmartHomeClient() {
  const router = useRouter()

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const supabase = createClientAuth()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        // Not logged in - stay on landing page
        if (authError || !user) {
          return
        }

        // Get user profile to check role
        const { data: profile, error: profileError } = await (supabase as any)
          .from('profiles')
          .select('is_corporate_user, corporate_role')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.error('Error fetching profile:', profileError)
          return
        }

        // Route based on user type
        if (profile.is_corporate_user) {
          if (profile.corporate_role === 'admin') {
            router.replace('/corporate/dashboard')
          } else {
            router.replace('/employee-portal/dashboard')
          }
        } else {
          // Regular user - send to communities page
          router.replace('/communities')
        }
      } catch (error) {
        console.error('Error in smart home redirect:', error)
      }
    }

    handleRedirect()
  }, [router])

  // Show nothing while redirecting
  return null
}

