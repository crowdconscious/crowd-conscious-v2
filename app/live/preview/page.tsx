'use client'

/**
 * Dev preview: Conscious Live UI building blocks (mock data).
 * Remove or protect this route in production if desired.
 */
import { StreamEmbed } from '@/components/live/StreamEmbed'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'
import { FundImpactTicker } from '@/components/live/FundImpactTicker'
import { ViewerCount } from '@/components/live/ViewerCount'
import type { LiveLeaderboardEntry } from '@/hooks/useLiveLeaderboard'

const mockRankings: LiveLeaderboardEntry[] = [
  {
    rank: 1,
    user_id: 'a',
    username: 'cheesecake',
    avatar_url: null,
    total_xp: 145,
    correct_count: 3,
    vote_count: 5,
  },
  {
    rank: 2,
    user_id: 'b',
    username: 'maria_cdmx',
    avatar_url: null,
    total_xp: 120,
    correct_count: 2,
    vote_count: 5,
  },
  {
    rank: 3,
    user_id: 'c',
    username: 'futbolero99',
    avatar_url: null,
    total_xp: 95,
    correct_count: 2,
    vote_count: 5,
  },
  {
    rank: 4,
    user_id: 'd',
    username: 'predictor',
    avatar_url: null,
    total_xp: 80,
    correct_count: 1,
    vote_count: 5,
  },
  {
    rank: 12,
    user_id: 'you',
    username: 'you',
    avatar_url: null,
    total_xp: 30,
    correct_count: 1,
    vote_count: 5,
  },
]

export default function LivePreviewPage() {
  const future = new Date(Date.now() + 3600_000).toISOString()
  return (
    <div className="min-h-screen bg-[#0a0e14] px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <h1 className="text-xl font-bold text-white">Conscious Live — component preview</h1>

        <StreamEmbed youtubeVideoId={null} isLive={false} matchDate={future} />

        <div className="flex flex-wrap items-center gap-3">
          <ViewerCount count={245} isConnected locale="es" />
          <ViewerCount count={12} isConnected={false} locale="en" />
        </div>

        <FundImpactTicker
          totalVotes={1247}
          fundImpact={62.35}
          activeCause="Clean Water CDMX"
          sponsorName="Heineken"
          locale="es"
        />

        <LiveLeaderboard
          rankings={mockRankings.slice(0, 4)}
          currentUserId="you"
          currentUserEntry={mockRankings[4]}
          locale="es"
        />
      </div>
    </div>
  )
}
