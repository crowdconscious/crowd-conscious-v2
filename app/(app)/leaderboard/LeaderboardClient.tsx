'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLeaderboard } from '@/hooks/useUserTier'
import { useUserTier } from '@/hooks/useUserTier'
import { getTierByXP } from '@/lib/tier-config'
import { Trophy, Medal, Award, TrendingUp, Filter } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/UIComponents'
import { XPBadge } from '@/components/gamification/XPBadge'

interface LeaderboardClientProps {
  user: any
}

interface LeaderboardEntry {
  user_id: string
  full_name: string | null
  email: string
  total_xp: number
  tier: number
  rank: number
  avatar_url?: string | null
}

export default function LeaderboardClient({ user }: LeaderboardClientProps) {
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all')
  const [tierFilter, setTierFilter] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<{ rank: number; total_xp: number; tier: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { tier: currentUserTier } = useUserTier()

  useEffect(() => {
    fetchLeaderboard()
  }, [timeframe, tierFilter])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '100',
        offset: '0'
      })
      if (tierFilter) {
        params.append('tier', tierFilter.toString())
      }

      const response = await fetch(`/api/gamification/leaderboard?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const result = await response.json()
      console.log('Full API response:', result)
      
      if (result.success) {
        const leaderboardData = result.data?.leaderboard || []
        const userRankData = result.data?.user_rank || null
        
        console.log('Leaderboard array:', leaderboardData)
        console.log('Leaderboard count:', leaderboardData.length)
        console.log('User rank:', userRankData)
        
        setLeaderboard(leaderboardData)
        setUserRank(userRankData)
        
        // Log for debugging
        console.log('Leaderboard data:', {
          leaderboardCount: leaderboardData.length,
          userRank: userRankData,
          firstEntry: leaderboardData[0],
          allEntries: leaderboardData
        })
      } else {
        console.error('Leaderboard API error:', result.error)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-yellow-600'
    if (rank === 2) return 'from-gray-300 to-gray-500'
    if (rank === 3) return 'from-orange-400 to-orange-600'
    return 'from-slate-200 to-slate-300'
  }

  const topThree = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="tier-themed-gradient text-white rounded-xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">🏆 Leaderboard</h1>
              <p className="text-white/90">See how you rank among all contributors</p>
            </div>
            <div className="hidden md:block">
              <XPBadge variant="compact" />
            </div>
          </div>

          {/* User's Rank */}
          {userRank && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 border border-white/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/80 mb-1">Your Rank</div>
                  <div className="text-2xl font-bold">#{userRank.rank}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/80 mb-1">Your XP</div>
                  <div className="text-2xl font-bold">{userRank.total_xp.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnimatedCard className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="font-medium text-white">Timeframe:</span>
          </div>
          <div className="flex gap-2">
            {(['all', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {period === 'all' ? 'All Time' : period === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="font-medium text-white">Tier:</span>
            <select
              value={tierFilter || ''}
              onChange={(e) => setTierFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Tiers</option>
              <option value="1">🌱 Explorer</option>
              <option value="2">🌊 Contributor</option>
              <option value="3">💜 Changemaker</option>
              <option value="4">⭐ Impact Leader</option>
              <option value="5">👑 Legend</option>
            </select>
          </div>
        </div>
      </AnimatedCard>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {topThree.map((entry, index) => {
            const rank = index + 1
            const tierConfig = getTierByXP(entry.total_xp)
            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-gradient-to-br ${getRankColor(rank)} rounded-xl p-6 text-white shadow-lg ${
                  rank === 1 ? 'md:scale-110 md:-mt-4' : ''
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{getRankIcon(rank)}</div>
                  <div className="text-3xl font-bold mb-1">#{rank}</div>
                  <div className="text-lg font-semibold mb-2 truncate">
                    {entry.full_name || entry.email.split('@')[0]}
                  </div>
                  <div className="text-2xl font-bold mb-1">{entry.total_xp.toLocaleString()} XP</div>
                  <div className="text-sm opacity-90">{tierConfig.name}</div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Rest of Leaderboard */}
      <AnimatedCard className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-6">All Rankings</h2>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-1/3" />
                  <div className="h-3 bg-slate-700 rounded w-1/4" />
                </div>
                <div className="h-6 bg-slate-700 rounded w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {rest.map((entry, index) => {
              const rank = index + 4
              const tierConfig = getTierByXP(entry.total_xp)
              const isCurrentUser = entry.user_id === (user as any).id
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    isCurrentUser
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : 'bg-slate-800/80 hover:bg-slate-800 border border-slate-700'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                    {rank}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold text-white ${isCurrentUser ? 'text-emerald-400' : ''}`}>
                        {entry.full_name || entry.email.split('@')[0]}
                        {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <span>{tierConfig.icon} {tierConfig.name}</span>
                    </div>
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <div className="font-bold text-white">{entry.total_xp.toLocaleString()} XP</div>
                    <div className="text-xs text-slate-500">Tier {entry.tier}</div>
                  </div>
                </motion.div>
              )
            })}

            {leaderboard.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No rankings yet</p>
                <p className="text-slate-500 text-sm mt-2">Start earning XP to appear on the leaderboard!</p>
              </div>
            )}
          </div>
        )}
      </AnimatedCard>
    </div>
  )
}

