import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { getTierByXP, calculateProgressToNextTier } from '@/lib/tier-config'

interface UserXP {
  id: string
  user_id: string
  total_xp: number
  current_tier: number
  tier_progress: number
  xp_to_next_tier: number
  created_at: string
  updated_at: string
}

interface TierProgress {
  tier: number
  progress: number
  xp_to_next: number
  total_xp: number
  current_tier_xp: number
  next_tier_xp: number | null
}

interface UseUserTierReturn {
  xp: UserXP | null
  tier: ReturnType<typeof getTierByXP>
  progress: ReturnType<typeof calculateProgressToNextTier>
  isLoading: boolean
  error: Error | null
  refetch: () => void
  awardXP: (actionType: string, actionId?: string, description?: string) => Promise<any>
}

/**
 * Hook to get and manage user XP and tier information
 * Uses simple fetch with caching (React Query can be added later)
 */
export function useUserTier(): UseUserTierReturn {
  const supabase = createClient()
  const [xp, setXp] = useState<UserXP | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  const fetchXP = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setXp(null)
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/gamification/xp', {
        cache: 'no-store' // Always fetch fresh data
      })

      if (!response.ok) {
        throw new Error('Failed to fetch XP data')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch XP')
      }

      setXp(result.data.xp as UserXP)
      setLastFetch(Date.now())
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching XP:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Fetch on mount and when window regains focus (if data is stale)
  useEffect(() => {
    fetchXP()

    const handleFocus = () => {
      // Refetch if data is older than 30 seconds
      if (Date.now() - lastFetch > 30000) {
        fetchXP()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchXP, lastFetch])

  // Calculate tier and progress
  const tier = useMemo(() => {
    if (!xp) return getTierByXP(0)
    return getTierByXP(xp.total_xp)
  }, [xp])

  const progress = useMemo(() => {
    if (!xp) return calculateProgressToNextTier(0)
    return calculateProgressToNextTier(xp.total_xp)
  }, [xp])

  // Function to award XP
  const awardXP = useCallback(async (
    actionType: string,
    actionId?: string,
    description?: string
  ) => {
    try {
      const response = await fetch('/api/gamification/xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action_type: actionType,
          action_id: actionId,
          description
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to award XP')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to award XP')
      }

      // Refetch XP data after awarding
      await fetchXP()

      return result.data
    } catch (err) {
      console.error('Error awarding XP:', err)
      throw err
    }
  }, [fetchXP])

  return {
    xp: xp || null,
    tier,
    progress,
    isLoading,
    error,
    refetch: fetchXP,
    awardXP
  }
}

/**
 * Hook to get user achievements
 * Simple fetch version (React Query can be added later)
 */
export function useUserAchievements(userId?: string) {
  const supabase = createClient()
  const [achievements, setAchievements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchAchievements() {
      try {
        setIsLoading(true)
        const targetUserId = userId
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setAchievements([])
            setIsLoading(false)
            return
          }
          const targetUserId = user.id
        }

        const response = await fetch(`/api/gamification/achievements?user_id=${targetUserId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch achievements')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch achievements')
        }

        setAchievements(result.data.achievements || [])
      } catch (err) {
        console.error('Error fetching achievements:', err)
        setAchievements([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAchievements()
  }, [userId, supabase])

  return { achievements, isLoading }
}

/**
 * Hook to get leaderboard
 * Simple fetch version (React Query can be added later)
 */
export function useLeaderboard(options?: {
  limit?: number
  offset?: number
  tier?: number
}) {
  const { limit = 100, offset = 0, tier } = options || {}
  const [leaderboard, setLeaderboard] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString()
        })
        if (tier) {
          params.append('tier', tier.toString())
        }

        const response = await fetch(`/api/gamification/leaderboard?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch leaderboard')
        }

        setLeaderboard(result.data)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setLeaderboard(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit, offset, tier])

  return { leaderboard, isLoading }
}

