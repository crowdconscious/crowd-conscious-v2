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
    entryKey: 'user:a',
    rank: 1,
    user_id: 'a',
    anonymous_participant_id: null,
    participantType: 'registered',
    username: 'cheesecake',
    avatar_url: null,
    avatar_emoji: null,
    total_xp: 145,
    correct_count: 3,
    vote_count: 5,
  },
  {
    entryKey: 'user:b',
    rank: 2,
    user_id: 'b',
    anonymous_participant_id: null,
    participantType: 'registered',
    username: 'maria_cdmx',
    avatar_url: null,
    avatar_emoji: null,
    total_xp: 120,
    correct_count: 2,
    vote_count: 5,
  },
  {
    entryKey: 'anon:c1',
    rank: 3,
    user_id: null,
    anonymous_participant_id: 'c1',
    participantType: 'anonymous',
    username: 'futbolero99',
    avatar_url: null,
    avatar_emoji: '⚽',
    total_xp: 95,
    correct_count: 2,
    vote_count: 5,
  },
  {
    entryKey: 'user:d',
    rank: 4,
    user_id: 'd',
    anonymous_participant_id: null,
    participantType: 'registered',
    username: 'predictor',
    avatar_url: null,
    avatar_emoji: null,
    total_xp: 80,
    correct_count: 1,
    vote_count: 5,
  },
  {
    entryKey: 'user:you',
    rank: 12,
    user_id: 'you',
    anonymous_participant_id: null,
    participantType: 'registered',
    username: 'you',
    avatar_url: null,
    avatar_emoji: null,
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
