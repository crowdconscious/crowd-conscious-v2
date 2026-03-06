'use client'

import Link from 'next/link'
import { ArrowLeft, Trophy, Medal, Award } from 'lucide-react'

type LeaderboardEntry = {
  rank: number
  user_id: string
  username: string
  total_xp: number
  prediction_count: number
  accuracy_pct: number | null
  isCurrentUser?: boolean
}

interface Props {
  leaderboard: LeaderboardEntry[]
  currentUserRank: LeaderboardEntry | null
}

export function LeaderboardClient({ leaderboard, currentUserRank }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Trophy className="w-7 h-7 text-amber-400" />
        Leaderboard
      </h1>
      <p className="text-slate-400">
        Top predictors by XP. Make predictions to climb the ranks.
      </p>

      {currentUserRank && !leaderboard.some((e) => e.user_id === currentUserRank.user_id) && (
        <div
          className={`rounded-xl p-4 border ${
            currentUserRank.isCurrentUser
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <p className="text-slate-400 text-sm mb-1">Your position</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">#{currentUserRank.rank}</span>
              <span className="font-medium text-white">{currentUserRank.username}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-amber-400 font-semibold">{currentUserRank.total_xp} XP</span>
              <span className="text-slate-400">{currentUserRank.prediction_count} predictions</span>
              <span className="text-slate-400">
                {currentUserRank.accuracy_pct != null ? `${currentUserRank.accuracy_pct}%` : '—'} accuracy
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-800 text-slate-400 text-sm font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-5">User</div>
          <div className="col-span-2 text-right">XP</div>
          <div className="col-span-2 text-right">Predictions</div>
          <div className="col-span-2 text-right">Accuracy</div>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No one on the leaderboard yet</p>
            <p className="text-sm mt-2">Make your first prediction to get started</p>
            <Link
              href="/predictions/markets"
              className="inline-block mt-4 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Browse markets →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${
                  entry.isCurrentUser ? 'bg-emerald-500/10' : ''
                }`}
              >
                <div className="col-span-1 flex items-center gap-1">
                  {entry.rank <= 3 ? (
                    <>
                      <Medal
                        className={`w-5 h-5 ${
                          entry.rank === 1
                            ? 'text-amber-400'
                            : entry.rank === 2
                              ? 'text-slate-300'
                              : 'text-amber-700'
                        }`}
                      />
                      <span className="text-slate-400 text-sm">#{entry.rank}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-medium">#{entry.rank}</span>
                  )}
                </div>
                <div className="col-span-5">
                  <span className="font-medium text-white">
                    {entry.username}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-xs text-emerald-400">(you)</span>
                    )}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="font-semibold text-amber-400">{entry.total_xp}</span>
                </div>
                <div className="col-span-2 text-right text-slate-400">
                  {entry.prediction_count}
                </div>
                <div className="col-span-2 text-right text-slate-400">
                  {entry.accuracy_pct != null ? `${entry.accuracy_pct}%` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
