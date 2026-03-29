'use client'

import { useMemo } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { Trophy } from 'lucide-react'
import type { LiveLeaderboardEntry } from '@/hooks/useLiveLeaderboard'
import { cn } from '@/lib/design-system'

const TIER_BADGE: Record<number, { emoji: string; className: string }> = {
  1: { emoji: '🥇', className: 'text-amber-300' },
  2: { emoji: '🥈', className: 'text-slate-300' },
  3: { emoji: '🥉', className: 'text-amber-700' },
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

function displayHandle(entry: LiveLeaderboardEntry): string {
  if (entry.participantType === 'anonymous') {
    const u = entry.username.trim()
    return u.startsWith('@') ? u : `@${u.replace(/\s+/g, '_').toLowerCase().slice(0, 18)}`
  }
  const u = entry.username.trim()
  if (u.startsWith('@')) return u
  return `@${u.replace(/\s+/g, '_').toLowerCase().slice(0, 18)}`
}

export interface LiveLeaderboardProps {
  rankings: LiveLeaderboardEntry[]
  currentUserId: string
  currentAnonymousParticipantId?: string | null
  currentUserEntry?: LiveLeaderboardEntry | null
  locale?: 'en' | 'es'
}

export function LiveLeaderboard({
  rankings,
  currentUserId,
  currentAnonymousParticipantId,
  currentUserEntry,
  locale = 'es',
}: LiveLeaderboardProps) {
  const top = useMemo(() => rankings.slice(0, 10), [rankings])

  const showFooter = !!(currentUserEntry && currentUserEntry.rank > 10)

  const isRowYou = (row: LiveLeaderboardEntry) => {
    if (row.participantType === 'anonymous') {
      return (
        !!currentAnonymousParticipantId &&
        row.anonymous_participant_id === currentAnonymousParticipantId
      )
    }
    return !!currentUserId && row.user_id === currentUserId
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 shadow-lg shadow-black/30">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h3 className="font-semibold text-white">
          {locale === 'es' ? 'Leaderboard del partido' : 'Match Leaderboard'}
        </h3>
      </div>

      <LayoutGroup>
        <ul className="divide-y divide-white/5">
          {top.map((row) => {
            const isYou = isRowYou(row)
            const medal = TIER_BADGE[row.rank]
            return (
              <motion.li
                layout="position"
                key={row.entryKey}
                initial={false}
                animate={{
                  backgroundColor: isYou ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0,0,0,0)',
                }}
                transition={{
                  layout: { duration: 0.4, ease: 'easeInOut' },
                  backgroundColor: { type: 'spring', stiffness: 380, damping: 32 },
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm',
                  isYou && 'ring-1 ring-emerald-500/30'
                )}
              >
                <span className="w-8 shrink-0 text-center font-mono text-slate-400">
                  {row.rank <= 3 && medal ? (
                    <span className={medal.className}>{medal.emoji}</span>
                  ) : (
                    row.rank
                  )}
                </span>
                {row.participantType === 'anonymous' ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center text-lg">
                    {row.avatar_emoji ?? '🎯'}
                  </span>
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{
                      background: row.avatar_url ? undefined : 'linear-gradient(135deg,#0d9488,#059669)',
                    }}
                  >
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatar_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials(row.username)
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-medium', isYou ? 'text-emerald-200' : 'text-white')}>
                    {displayHandle(row)}
                    {row.participantType === 'anonymous' && (
                      <span className="ml-1 text-xs text-slate-500">
                        {locale === 'es' ? '(invitado)' : '(guest)'}
                      </span>
                    )}
                    {isYou && (
                      <span className="ml-2 text-xs text-emerald-400/90">
                        {locale === 'es' ? '(tú)' : '(you)'}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-emerald-300">+{row.total_xp} XP</p>
                  <p className="text-xs text-slate-500">
                    {row.correct_count}/{row.vote_count}
                  </p>
                </div>
              </motion.li>
            )
          })}
        </ul>
      </LayoutGroup>

      {showFooter && currentUserEntry && (
        <>
          <div className="border-t border-white/10 px-4 py-1 text-center text-xs text-slate-500">
            ···
          </div>
          <motion.div
            layout
            transition={{ layout: { duration: 0.4, ease: 'easeInOut' } }}
            className="flex items-center gap-3 border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm"
          >
            <span className="w-8 shrink-0 text-center font-mono text-emerald-300">
              {currentUserEntry.rank}
            </span>
            {currentUserEntry.participantType === 'anonymous' ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center text-lg">
                {currentUserEntry.avatar_emoji ?? '🎯'}
              </span>
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  background: currentUserEntry.avatar_url
                    ? undefined
                    : 'linear-gradient(135deg,#0d9488,#059669)',
                }}
              >
                {currentUserEntry.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUserEntry.avatar_url}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initials(currentUserEntry.username)
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-emerald-100">
                {displayHandle(currentUserEntry)}
                {currentUserEntry.participantType === 'anonymous' && (
                  <span className="ml-1 text-xs text-slate-500">
                    {locale === 'es' ? '(invitado)' : '(guest)'}
                  </span>
                )}
                <span className="ml-2 text-xs text-emerald-300">
                  {locale === 'es' ? '(tú)' : '(you)'}
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold text-emerald-300">+{currentUserEntry.total_xp} XP</p>
              <p className="text-xs text-slate-500">
                {currentUserEntry.correct_count}/{currentUserEntry.vote_count}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
