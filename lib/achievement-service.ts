/**
 * Achievement Service
 * Handles checking and unlocking achievements based on user actions
 */

import { createClient } from '@/lib/supabase-server'

export interface Achievement {
  type: string
  name: string
  description: string
  icon: string
}

/**
 * Check and unlock achievements after an action
 * This should be called after awarding XP
 */
export async function checkAndUnlockAchievements(
  userId: string,
  actionType: string,
  actionId?: string
): Promise<Achievement[]> {
  const supabase = await createClient()

  // Call database function to check achievements
  const { data, error } = await supabase.rpc('check_achievements', {
    p_user_id: userId,
    p_action_type: actionType,
    p_action_id: actionId || null
  })

  if (error) {
    console.error('Error checking achievements:', error)
    return []
  }

  return (data?.unlocked || []) as Achievement[]
}

/**
 * Get all available achievement types
 */
export const ACHIEVEMENT_TYPES = {
  FIRST_LESSON: 'first_lesson',
  FIRST_MODULE: 'first_module',
  FIRST_SPONSOR: 'first_sponsor',
  TIER_CONTRIBUTOR: 'tier_contributor',
  TIER_CHANGEMAKER: 'tier_changemaker',
  TIER_IMPACT_LEADER: 'tier_impact_leader',
  TIER_LEGEND: 'tier_legend',
  STREAK_7_DAYS: 'streak_7_days',
  STREAK_30_DAYS: 'streak_30_days',
  MODULE_MASTER: 'module_master', // Complete 5 modules
  SPONSOR_HERO: 'sponsor_hero', // Sponsor 10 needs
  COMMUNITY_CHAMPION: 'community_champion' // Create 20 pieces of content
} as const

/**
 * Check for additional achievements that require counting
 */
export async function checkCountBasedAchievements(userId: string): Promise<Achievement[]> {
  const supabase = await createClient()
  const unlocked: Achievement[] = []

  // Check module completion count
  const { count: moduleCount } = await supabase
    .from('xp_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'module_completed')

  if (moduleCount && moduleCount >= 5) {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_type', ACHIEVEMENT_TYPES.MODULE_MASTER)
      .single()

    if (!existing) {
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_type: ACHIEVEMENT_TYPES.MODULE_MASTER,
        achievement_name: 'Module Master',
        achievement_description: 'Completed 5 modules!',
        icon_url: '📚'
      })
      unlocked.push({
        type: ACHIEVEMENT_TYPES.MODULE_MASTER,
        name: 'Module Master',
        description: 'Completed 5 modules!',
        icon: '📚'
      })
    }
  }

  // Check sponsorship count
  const { count: sponsorCount } = await supabase
    .from('xp_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'sponsor_need')

  if (sponsorCount && sponsorCount >= 10) {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_type', ACHIEVEMENT_TYPES.SPONSOR_HERO)
      .single()

    if (!existing) {
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_type: ACHIEVEMENT_TYPES.SPONSOR_HERO,
        achievement_name: 'Sponsor Hero',
        achievement_description: 'Sponsored 10 community needs!',
        icon_url: '💝'
      })
      unlocked.push({
        type: ACHIEVEMENT_TYPES.SPONSOR_HERO,
        name: 'Sponsor Hero',
        description: 'Sponsored 10 community needs!',
        icon: '💝'
      })
    }
  }

  // Check content creation count
  const { count: contentCount } = await supabase
    .from('xp_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'create_content')

  if (contentCount && contentCount >= 20) {
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_type', ACHIEVEMENT_TYPES.COMMUNITY_CHAMPION)
      .single()

    if (!existing) {
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_type: ACHIEVEMENT_TYPES.COMMUNITY_CHAMPION,
        achievement_name: 'Community Champion',
        achievement_description: 'Created 20 pieces of content!',
        icon_url: '🏆'
      })
      unlocked.push({
        type: ACHIEVEMENT_TYPES.COMMUNITY_CHAMPION,
        name: 'Community Champion',
        description: 'Created 20 pieces of content!',
        icon: '🏆'
      })
    }
  }

  return unlocked
}

