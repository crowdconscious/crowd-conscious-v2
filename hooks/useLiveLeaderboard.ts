'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Database } from '@/types/database'

type VoteRow = {
  user_id: string | null
  anonymous_participant_id: string | null
  xp_earned: number | null
  bonus_xp: number | null
  is_correct: boolean | null
}

export interface LiveLeaderboardEntry {
  /** Stable key for React: `user:uuid` or `anon:uuid` */
  entryKey: string
  user_id: string | null
  anonymous_participant_id: string | null
  participantType: 'registered' | 'anonymous'
  username: string
  avatar_url: string | null
  avatar_emoji: string | null
  total_xp: number
  correct_count: number
  vote_count: number
  rank: number
}

export interface UseLiveLeaderboardResult {
  rankings: LiveLeaderboardEntry[]
  currentUserRank: number | null
  currentUserEntry: LiveLeaderboardEntry | null
  isLoading: boolean
  error: Error | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

type AnonRow = { id: string; alias: string; avatar_emoji: string | null }

async function computeRankings(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  currentUserId?: string | null,
  currentAnonymousParticipantId?: string | null
): Promise<{
  rankings: LiveLeaderboardEntry[]
  currentUserEntry: LiveLeaderboardEntry | null
  error: Error | null
}> {
  const { data: markets, error: mErr } = await supabase
    .from('prediction_markets')
    .select('id')
    .eq('live_event_id', eventId)
    .is('archived_at', null)

  if (mErr) return { rankings: [], currentUserEntry: null, error: new Error(mErr.message) }

  const marketIds = (markets ?? []).map((m) => m.id)
  if (marketIds.length === 0) {
    return { rankings: [], currentUserEntry: null, error: null }
  }

  const { data: votes, error: vErr } = await supabase
    .from('market_votes')
    .select('user_id, anonymous_participant_id, xp_earned, bonus_xp, is_correct')
    .in('market_id', marketIds)

  if (vErr) return { rankings: [], currentUserEntry: null, error: new Error(vErr.message) }

  const rows = (votes ?? []) as VoteRow[]

  const agg = new Map<
    string,
    {
      total_xp: number
      correct_count: number
      vote_count: number
      isAnonymous: boolean
      user_id: string | null
      anonymous_participant_id: string | null
    }
  >()

  for (const v of rows) {
    const anonId = v.anonymous_participant_id
    const key = anonId ? `anon:${anonId}` : v.user_id ? `user:${v.user_id}` : null
    if (!key) continue

    const xp = (v.xp_earned ?? 0) + (v.bonus_xp ?? 0)
    const cur = agg.get(key) ?? {
      total_xp: 0,
      correct_count: 0,
      vote_count: 0,
      isAnonymous: !!anonId,
      user_id: anonId ? null : v.user_id,
      anonymous_participant_id: anonId,
    }
    cur.total_xp += xp
    cur.vote_count += 1
    if (v.is_correct === true) cur.correct_count += 1
    agg.set(key, cur)
  }

  const sortedPairs = [...agg.entries()].sort((a, b) => b[1].total_xp - a[1].total_xp)
  if (sortedPairs.length === 0) {
    return { rankings: [], currentUserEntry: null, error: null }
  }

  const userIds = sortedPairs
    .filter(([, s]) => !s.isAnonymous && s.user_id)
    .map(([, s]) => s.user_id as string)

  const anonIds = sortedPairs
    .filter(([, s]) => s.isAnonymous && s.anonymous_participant_id)
    .map(([, s]) => s.anonymous_participant_id as string)

  const [{ data: profileRows }, { data: anonRows }] = await Promise.all([
    userIds.length
      ? supabase.rpc('get_profiles_public', { p_ids: userIds })
      : Promise.resolve({ data: [] as ProfileRow[] | null }),
    anonIds.length
      ? supabase.from('anonymous_participants').select('id, alias, avatar_emoji').in('id', anonIds)
      : Promise.resolve({ data: [] as AnonRow[] | null }),
  ])

  const profileMap = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((p) => [
      p.id,
      { username: p.full_name?.trim() || 'Player', avatar_url: p.avatar_url },
    ])
  )

  const anonMap = new Map(
    ((anonRows ?? []) as AnonRow[]).map((a) => [
      a.id,
      { alias: a.alias, emoji: a.avatar_emoji ?? '🎯' },
    ])
  )

  const full: LiveLeaderboardEntry[] = sortedPairs.map(([key, stats], i) => {
    if (stats.isAnonymous && stats.anonymous_participant_id) {
      const a = anonMap.get(stats.anonymous_participant_id)
      return {
        entryKey: key,
        user_id: null,
        anonymous_participant_id: stats.anonymous_participant_id,
        participantType: 'anonymous' as const,
        username: a?.alias ?? 'Invitado',
        avatar_url: null,
        avatar_emoji: a?.emoji ?? '🎯',
        total_xp: stats.total_xp,
        correct_count: stats.correct_count,
        vote_count: stats.vote_count,
        rank: i + 1,
      }
    }
    const uid = stats.user_id!
    const p = profileMap.get(uid)
    return {
      entryKey: key,
      user_id: uid,
      anonymous_participant_id: null,
      participantType: 'registered' as const,
      username: p?.username ?? 'Player',
      avatar_url: p?.avatar_url ?? null,
      avatar_emoji: null,
      total_xp: stats.total_xp,
      correct_count: stats.correct_count,
      vote_count: stats.vote_count,
      rank: i + 1,
    }
  })

  const rankings = full.slice(0, 20)

  let currentUserEntry: LiveLeaderboardEntry | null = null
  if (currentUserId) {
    currentUserEntry = full.find((r) => r.user_id === currentUserId) ?? null
  } else if (currentAnonymousParticipantId) {
    currentUserEntry =
      full.find((r) => r.anonymous_participant_id === currentAnonymousParticipantId) ?? null
  }

  return { rankings, currentUserEntry, error: null }
}

/**
 * Live match leaderboard: registered + anonymous alias participants for markets tied to `eventId`.
 */
export function useLiveLeaderboard(
  eventId: string | null,
  currentUserId?: string | null,
  currentAnonymousParticipantId?: string | null
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
        currentUserId,
        currentAnonymousParticipantId
      )
      if (err) setError(err)
      setRankings(r)
      setCurrentUserEntry(cu)
      if (!silent) setIsLoading(false)
    },
    [eventId, supabase, currentUserId, currentAnonymousParticipantId]
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
