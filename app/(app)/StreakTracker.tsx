'use client'

import { useEffect, useState } from 'react'
import { createClientAuth } from '@/lib/auth'

/**
 * StreakTracker Component
 * 
 * Automatically tracks user's daily login streak and awards XP
 * This component runs once per session when user loads any page in the app
 * 
 * Features:
 * - Calls update_user_streak() function on mount
 * - Awards +10 XP for daily login
 * - Increments streak if consecutive days
 * - Awards streak bonus XP (5 XP × streak days)
 * - Resets streak if user missed a day
 */
export default function StreakTracker() {
  const [hasTracked, setHasTracked] = useState(false)
  
  useEffect(() => {
    // Only run once per session
    if (hasTracked) return
    
    const trackStreak = async () => {
      try {
        const supabase = createClientAuth()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.warn('⚠️ Streak tracker: Auth error:', authError.message)
          return
        }
        
        if (!user) {
          console.warn('⚠️ Streak tracker: No user found')
          return
        }
        
        console.log('🔄 Tracking daily streak for user:', user.id)
        
        // Call the streak update function with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Streak update timeout')), 5000)
        )
        
        // @ts-expect-error - RPC function not in generated types yet
        const streakPromise = supabase.rpc('update_user_streak', { 
          p_user_id: user.id 
        })
        
        try {
          const { error } = await Promise.race([streakPromise, timeoutPromise]) as any
          
          if (error) {
            // Check if it's a "function does not exist" or "table does not exist" error
            if (error.code === '42883' || error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('404')) {
              // Silently skip - gamification features are optional
              // Don't log as error - this is expected if the function isn't deployed
              return
            } else {
              console.error('❌ Error updating streak:', error)
            }
          } else {
            console.log('✅ Daily streak tracked successfully')
          }
        } catch (rpcError: any) {
          // Handle RPC call failures gracefully
          if (rpcError.message?.includes('timeout') || rpcError.message?.includes('404') || rpcError.code === '42883') {
            // Silently skip - gamification features are optional
            return
          }
          throw rpcError
        }
        
        setHasTracked(true)
      } catch (error: any) {
        if (error.message === 'Streak update timeout') {
          console.warn('⚠️ Streak update timed out - continuing anyway')
        } else {
          console.error('💥 Error in streak tracker:', error)
        }
        setHasTracked(true) // Mark as tracked even on error to prevent retries
      }
    }
    
    // Small delay to let auth settle
    const timer = setTimeout(trackStreak, 1000)
    return () => clearTimeout(timer)
  }, [hasTracked])

  // This component doesn't render anything
  return null
}

