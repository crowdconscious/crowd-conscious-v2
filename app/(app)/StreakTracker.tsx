'use client'

import { useEffect } from 'react'
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
  useEffect(() => {
    const trackStreak = async () => {
      try {
        const supabase = createClientAuth()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return
        
        // Call the streak update function
        const { error } = await supabase.rpc('update_user_streak', { 
          p_user_id: user.id 
        })
        
        if (error) {
          console.error('Error updating streak:', error)
        } else {
          console.log('✅ Daily streak tracked')
        }
      } catch (error) {
        console.error('Error in streak tracker:', error)
      }
    }
    
    // Track streak on mount
    trackStreak()
  }, []) // Empty dependency array = runs once per session

  // This component doesn't render anything
  return null
}

