'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Trophy, Check, X, Clock } from 'lucide-react'
import Image from 'next/image'

type RecentPrediction = {
  market_id: string
  market_title: string
  status: 'correct' | 'incorrect' | 'pending'
}

type LeaderboardEntry = {
  rank: number
  user_id: string
  username: string
  email: string | null
  avatar_url: string | null
  total_xp: number
  prediction_count: number
  accuracy_pct: number | null
  tier: string
  recent_predictions: RecentPrediction[]
  streak_days: number
  isCurrentUser?: boolean
}

interface Props {
  leaderboard: LeaderboardEntry[]
  currentUserRank: LeaderboardEntry | null
  isAuthenticated?: boolean
  currentCategory: string
  categories: readonly string[]
}

const TIER_CONFIG: Record<string, { label: string; emoji: string; color: string; glow?: string; hoverBorder?: string }> = {
  novice: { label: 'Novice', emoji: '🌱', color: 'bg-slate-600', hoverBorder: 'group-hover:border-slate-500' },
  rising: { label: 'Rising', emoji: '⚡', color: 'bg-blue-500', hoverBorder: 'group-hover:border-blue-500/50' },
  hot_streak: { label: 'Hot Streak', emoji: '🔥', color: 'bg-orange-500', hoverBorder: 'group-hover:border-orange-500/50' },
  champion: { label: 'Champion', emoji: '🏆', color: 'bg-amber-500', hoverBorder: 'group-hover:border-amber-500/50' },
  legend: { label: 'Legend', emoji: '👑', color: 'bg-purple-500', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.5)]', hoverBorder: 'group-hover:border-purple-500/50' },
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  world_cup: 'World Cup',
  world: 'World',
  pulse: 'Pulse',
  government: 'Government',
  geopolitics: 'Geopolitics',
  sustainability: 'Sustainability',
  technology: 'Technology',
  economy: 'Economy',
  corporate: 'Corporate',
  community: 'Community',
  cause: 'Cause',
  entertainment: 'Entertainment',
}

function hashToColor(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  const hue = Math.abs(h % 360)
  return `hsl(${hue}, 60%, 45%)`
}

function getInitials(fullName: string | null): string {
  if (!fullName?.trim()) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return fullName.slice(0, 2).toUpperCase()
}

function XPCounter({ value }: { value: number }) {
  const [display, setDisplay] = React.useState(0)
  React.useEffect(() => {
    let start = 0
    const duration = 800
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 2)
      setDisplay(Math.round(value * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <span>{display}</span>
}

function AccuracyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-500">—</span>
  const color =
    pct > 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'
  return <span className={color}>{pct}%</span>
}

function RecentPredictionBadge({ pred }: { pred: RecentPrediction }) {
  const config =
    pred.status === 'correct'
      ? { icon: Check, bg: 'bg-emerald-500/20', text: 'text-emerald-400', title: pred.market_title }
      : pred.status === 'incorrect'
        ? { icon: X, bg: 'bg-red-500/20', text: 'text-red-400', title: pred.market_title }
        : { icon: Clock, bg: 'bg-amber-500/20', text: 'text-amber-400', title: pred.market_title }
  const Icon = config.icon
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.bg} ${config.text} text-xs`}
      title={config.title}
    >
      <Icon className="w-3 h-3" />
    </span>
  )
}

export function LeaderboardClient({
  leaderboard,
  currentUserRank,
  isAuthenticated = true,
  currentCategory,
  categories,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('category')
    else params.set('category', cat)
    router.push(`/predictions/leaderboard${params.toString() ? `?${params}` : ''}`)
  }

  const handleShare = (entry: LeaderboardEntry) => {
    const text = `I'm ranked #${entry.rank} on Crowd Conscious with ${entry.total_xp} XP! 🏆 Predict the World Cup → crowdconscious.app`
    navigator.clipboard.writeText(text)
    // Could add toast feedback
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0e14' }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Link
          href={isAuthenticated ? '/predictions' : '/'}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAuthenticated ? 'Back to dashboard' : 'Volver al inicio'}
        </Link>

        <header className="relative overflow-hidden rounded-2xl p-8 border border-white/[0.08]"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
          <div className="relative flex items-center gap-4">
            <Trophy className="w-10 h-10 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
              <p className="text-slate-400 mt-0.5">
                Top predictors by XP. Make predictions to climb the ranks.
              </p>
            </div>
          </div>
        </header>

        {!isAuthenticated && (
          <Link
            href="/signup"
            className="block w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-center transition-colors"
          >
            Sign up to start earning XP
          </Link>
        )}

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              currentCategory === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:border-white/20'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                currentCategory === c
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:border-white/20'
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>

        {/* Current user card (when not in top list) */}
        {currentUserRank && !leaderboard.some((e) => e.user_id === currentUserRank.user_id) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 border border-emerald-500/30"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-400">#{currentUserRank.rank}</span>
                <span className="font-semibold text-white">{currentUserRank.username}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-400 font-bold">{currentUserRank.total_xp} XP</span>
                <span className="text-slate-400">{currentUserRank.prediction_count} predictions</span>
                <span className="text-slate-400">
                  <AccuracyBadge pct={currentUserRank.accuracy_pct} /> accuracy
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard table */}
        <div
          className="rounded-2xl overflow-hidden border border-white/[0.08]"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
            <motion.div
              className="divide-y divide-white/[0.06]"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.04 } },
                hidden: {},
              }}
            >
              {leaderboard.map((entry) => {
                const tierConfig = TIER_CONFIG[entry.tier] ?? TIER_CONFIG.novice
                const rankColor =
                  entry.rank <= 3
                    ? entry.rank === 1
                      ? '#FFD700'
                      : entry.rank === 2
                        ? '#C0C0C0'
                        : '#CD7F32'
                    : 'white'
                return (
                  <motion.div
                    key={entry.user_id}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    className={`group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition-all duration-200 hover:bg-white/[0.02] hover:-translate-y-0.5 border-l-[3px] ${
                      entry.isCurrentUser ? 'border-emerald-500/60' : 'border-transparent'
                    } ${tierConfig.hoverBorder ?? ''}`}
                  >
                    {/* Main row: rank, avatar, name, XP */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-10 sm:w-12 shrink-0 text-lg sm:text-xl font-bold" style={{ color: rankColor }}>
                        #{entry.rank}
                      </div>
                      <div
                        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
                        style={{
                          backgroundColor: entry.avatar_url ? 'transparent' : hashToColor(entry.user_id),
                        }}
                      >
                        {entry.avatar_url ? (
                          <Image
                            src={entry.avatar_url}
                            alt=""
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          getInitials(entry.username)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate">{entry.username}</span>
                          {entry.isCurrentUser && (
                            <span className="text-xs text-emerald-400">(you)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 text-sm">
                          <span className="font-bold text-emerald-400">
                            <XPCounter value={entry.total_xp} /> XP
                          </span>
                          <span className="text-slate-500 hidden sm:inline">{entry.prediction_count} predictions</span>
                          <span className="text-slate-500 hidden sm:inline">
                            <AccuracyBadge pct={entry.accuracy_pct} /> accuracy
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary: tier, recent, streak, share - desktop inline, mobile row */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pl-[52px] sm:pl-0">
                      <span className="sm:hidden text-slate-500 text-sm">{entry.prediction_count} predictions · <AccuracyBadge pct={entry.accuracy_pct} /></span>
                      <div
                        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium ${tierConfig.color} text-white ${tierConfig.glow ?? ''}`}
                      >
                        {tierConfig.emoji} {tierConfig.label}
                      </div>
                      <div className="flex items-center gap-1">
                        {entry.recent_predictions.slice(0, 3).map((p, i) => (
                          <RecentPredictionBadge key={`${p.market_id}-${i}`} pred={p} />
                        ))}
                      </div>
                      {entry.streak_days > 1 && (
                        <span className="text-amber-400 text-sm">🔥 {entry.streak_days} days</span>
                      )}
                      {entry.isCurrentUser && (
                        <button
                          onClick={() => handleShare(entry)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                        >
                          Share My Rank 📤
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
