// XP System Utilities
import { createClient } from '@/lib/supabase-server'

export interface XPReward {
  action_type: string
  xp_amount: number
  description: string
}

/**
 * Award XP to a user for a specific action
 */
export interface XPResult {
  success: boolean
  xp_amount: number
  total_xp: number
  old_tier: number
  new_tier: number
  tier_changed: boolean
  tier_progress: number
  xp_to_next_tier: number
}

export async function awardXP(
  userId: string,
  actionType: string,
  actionId?: string,
  description?: string
): Promise<XPResult> {
  const supabase = await createClient()
  
  // Call the database function to award XP
  const { data, error } = await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_action_type: actionType,
    p_action_id: actionId || null,
    p_description: description || null
  })

  if (error) {
    console.error('Error awarding XP:', error)
    throw error
  }

  // Handle case where XP already awarded (returns success: false)
  if (data && typeof data === 'object' && 'success' in data && !data.success) {
    return data as XPResult
  }

  // Return full result object
  return data as XPResult
}

/**
 * Get user's current XP and tier information
 */
export async function getUserXP(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching user XP:', error)
    throw error
  }

  return data
}

/**
 * Get XP transaction history for a user
 */
export async function getXPHistory(userId: string, limit = 50) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('xp_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching XP history:', error)
    throw error
  }

  return data || []
}

/**
 * Get user achievements
 */
export async function getUserAchievements(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('Error fetching achievements:', error)
    throw error
  }

  return data || []
}

/**
 * Check if user should unlock an achievement
 */
export async function checkAndUnlockAchievement(
  userId: string,
  achievementType: string,
  achievementName: string,
  achievementDescription: string,
  iconUrl?: string
) {
  const supabase = await createClient()
  
  // Check if already unlocked
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_type', achievementType)
    .single()

  if (existing) {
    return false // Already unlocked
  }

  // Unlock achievement
  const { error } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_type: achievementType,
      achievement_name: achievementName,
      achievement_description: achievementDescription,
      icon_url: iconUrl || null
    })

  if (error) {
    console.error('Error unlocking achievement:', error)
    return false
  }

  return true
}

