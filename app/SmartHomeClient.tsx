'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientAuth } from '@/lib/auth'

/**
 * Smart Home Redirect
 *
 * When a logged-in user visits the home page (/), redirect them to the main
 * dashboard (/predictions). Not logged in → stay on landing page.
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

        // Logged in - always go to main dashboard
        router.replace('/predictions')
      } catch (error) {
        console.error('Error in smart home redirect:', error)
      }
    }

    handleRedirect()
  }, [router])

  // Show nothing while redirecting
  return null
}

