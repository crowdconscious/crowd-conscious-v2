'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Database } from '@/types/database'

type VotePick = Pick<
  Database['public']['Tables']['market_votes']['Row'],
  'user_id' | 'xp_earned' | 'bonus_xp' | 'is_correct'
>

export interface LiveLeaderboardEntry {
  user_id: string
  username: string
  avatar_url: string | null
  total_xp: number
  correct_count: number
  vote_count: number
  rank: number
}

export interface UseLiveLeaderboardResult {
  rankings: LiveLeaderboardEntry[]
  /** 1-based rank for the current user, or null if not ranked / not logged in */
  currentUserRank: number | null
  /** Full row for the current user (even when outside the top-20 slice) */
  currentUserEntry: LiveLeaderboardEntry | null
  isLoading: boolean
  error: Error | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

async function computeRankings(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  currentUserId?: string | null
): Promise<{
  rankings: LiveLeaderboardEntry[]
  currentUserEntry: LiveLeaderboardEntry | null
  error: Error | null
}> {
  const { data: markets, error: mErr } = await supabase
    .from('prediction_markets')
    .select('id')
    .eq('live_event_id', eventId)

  if (mErr) return { rankings: [], currentUserEntry: null, error: new Error(mErr.message) }

  const marketIds = (markets ?? []).map((m) => m.id)
  if (marketIds.length === 0) {
    return { rankings: [], currentUserEntry: null, error: null }
  }

  const { data: votes, error: vErr } = await supabase
    .from('market_votes')
    .select('user_id, xp_earned, bonus_xp, is_correct')
    .in('market_id', marketIds)
    .eq('is_anonymous', false)

  if (vErr) return { rankings: [], currentUserEntry: null, error: new Error(vErr.message) }

  const rows = (votes ?? []) as VotePick[]

  const agg = new Map<
    string,
    { total_xp: number; correct_count: number; vote_count: number }
  >()

  for (const v of rows) {
    const uid = v.user_id
    const xp = (v.xp_earned ?? 0) + (v.bonus_xp ?? 0)
    const cur = agg.get(uid) ?? { total_xp: 0, correct_count: 0, vote_count: 0 }
    cur.total_xp += xp
    cur.vote_count += 1
    if (v.is_correct === true) cur.correct_count += 1
    agg.set(uid, cur)
  }

  const sortedPairs = [...agg.entries()].sort((a, b) => b[1].total_xp - a[1].total_xp)
  const userIds = sortedPairs.map(([uid]) => uid)

  if (userIds.length === 0) {
    return { rankings: [], currentUserEntry: null, error: null }
  }

  const { data: profileRows, error: rpcErr } = await supabase.rpc('get_profiles_public', {
    p_ids: userIds,
  })

  if (rpcErr) {
    return {
      rankings: [],
      currentUserEntry: null,
      error: new Error(rpcErr.message),
    }
  }

  const profileMap = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((p) => [
      p.id,
      {
        username: p.full_name?.trim() || 'Player',
        avatar_url: p.avatar_url,
      },
    ])
  )

  const full: LiveLeaderboardEntry[] = sortedPairs.map(([user_id, stats], i) => {
    const p = profileMap.get(user_id)
    return {
      user_id,
      username: p?.username ?? 'Player',
      avatar_url: p?.avatar_url ?? null,
      total_xp: stats.total_xp,
      correct_count: stats.correct_count,
      vote_count: stats.vote_count,
      rank: i + 1,
    }
  })

  const rankings = full.slice(0, 20)
  const currentUserEntry = currentUserId
    ? full.find((r) => r.user_id === currentUserId) ?? null
    : null

  return { rankings, currentUserEntry, error: null }
}

/**
 * Live match leaderboard: aggregates registered votes for markets tied to `eventId`,
 * debounces recalculation on new votes (2s).
 * Uses `get_profiles_public` RPC so anon/authenticated clients get names without full profiles SELECT.
 */
export function useLiveLeaderboard(
  eventId: string | null,
  currentUserId?: string | null
): UseLiveLeaderboardResult {
  const supabase = useMemo(() => createClient(), [])
  const [rankings, setRankings] = useState<LiveLeaderboardEntry[]>([])
  const [currentUserEntry, setCurrentUserEntry] = useState<LiveLeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRankings = useCallback(
    async (silent = false) => {
      if (!eventId) {
        setRankings([])
        setCurrentUserEntry(null)
        if (!silent) setIsLoading(false)
        return
      }
      if (!silent) {
        setIsLoading(true)
        setError(null)
      }
      const { rankings: r, currentUserEntry: cu, error: err } = await computeRankings(
        supabase,
        eventId,
        currentUserId
      )
      if (err) setError(err)
      setRankings(r)
      setCurrentUserEntry(cu)
      if (!silent) setIsLoading(false)
    },
    [eventId, supabase, currentUserId]
  )

  useEffect(() => {
    void fetchRankings(false)
  }, [fetchRankings])

  useEffect(() => {
    if (!eventId) return

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        void fetchRankings(true)
      }, 2000)
    }

    const channel = supabase
      .channel(`live-leaderboard-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_votes' },
        () => {
          schedule()
        }
      )
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [eventId, supabase, fetchRankings])

  const currentUserRank = useMemo(
    () => currentUserEntry?.rank ?? null,
    [currentUserEntry]
  )

  return { rankings, currentUserRank, currentUserEntry, isLoading, error }
}
