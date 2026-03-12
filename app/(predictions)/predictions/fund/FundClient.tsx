'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Vote, Sparkles, Users, ArrowRight, Info } from 'lucide-react'

type Cause = {
  id: string
  name: string
  description: string | null
  organization: string | null
  category: string | null
  vote_count: number
}

type Sponsor = {
  id: string
  title: string
  sponsor_name?: string
  sponsor_logo_url?: string
  sponsor_contribution: number
}

const CATEGORY_LABELS: Record<string, string> = {
  water: 'Clean Water',
  education: 'Education',
  environment: 'Environment',
  social_justice: 'Social Justice',
  health: 'Health',
  other: 'Other',
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${Math.round(num)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface Props {
  totalFund: number
  causesSupported: number
  monthlyAllocation: number
  yourImpactXp: number
  causes: Cause[]
  cycle: string
  votePower: number
  votesUsed: number
  myVotesByCause: Record<string, number>
  maxVotes: number
  sponsors: Sponsor[]
  totalDisbursed: number
}

export function FundClient({
  totalFund,
  causesSupported,
  monthlyAllocation,
  yourImpactXp,
  causes = [],
  cycle = '',
  votePower = 1,
  votesUsed = 0,
  myVotesByCause = {},
  maxVotes = 1,
  sponsors = [],
  totalDisbursed = 0,
}: Props) {
  const [voting, setVoting] = useState<Record<string, boolean>>({})
  const [localVotesUsed, setLocalVotesUsed] = useState(votesUsed)
  const [localCauseVotes, setLocalCauseVotes] = useState<Record<string, number>>(myVotesByCause)
  const [localCauseTotals, setLocalCauseTotals] = useState<Record<string, number>>(
    causes.reduce((acc, c) => ({ ...acc, [c.id]: c.vote_count }), {})
  )

  const canVote = localVotesUsed < votePower

  const handleVote = async (causeId: string) => {
    if (!canVote || voting[causeId]) return
    setVoting((p) => ({ ...p, [causeId]: true }))
    try {
      const res = await fetch('/api/predictions/fund/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cause_id: causeId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setLocalVotesUsed((u) => u + 1)
        setLocalCauseVotes((v) => ({ ...v, [causeId]: (v[causeId] ?? 0) + 1 }))
        setLocalCauseTotals((t) => ({ ...t, [causeId]: (t[causeId] ?? 0) + 1 }))
      }
    } catch {
      // ignore
    } finally {
      setVoting((p) => ({ ...p, [causeId]: false }))
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Section 1: Fund Overview */}
      <div>
        <h1 className="text-3xl font-bold text-white">The Conscious Fund</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Powered by sponsors. Directed by you.
        </p>
        <p className="text-slate-500 mt-2 text-sm max-w-2xl">
          When brands sponsor prediction markets on Crowd Conscious, a portion of their contribution
          goes to the Conscious Fund. Users vote on which community causes receive grants each month.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Total Fund</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalFund)} MXN
          </p>
          <p className="text-slate-500 text-xs mt-1">From sponsors (40%) + trade fees</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Causes Supported</p>
          <p className="text-2xl font-bold text-white">{causesSupported}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Monthly Allocation</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(monthlyAllocation)} MXN
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm mb-1">Your Impact</p>
          <p className="text-2xl font-bold text-white">{yourImpactXp} XP</p>
          <p className="text-slate-500 text-xs mt-1">From predictions</p>
        </div>
      </div>

      {/* Section 2: Vote for Causes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Vote className="w-5 h-5 text-emerald-400" />
            Vote for Causes
          </h2>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
            You have {votePower - localVotesUsed} vote{votePower - localVotesUsed !== 1 ? 's' : ''} remaining this month
            {cycle && ` · Cycle ${cycle}`}
            <span
              className="inline-flex text-slate-500 hover:text-slate-400 cursor-help"
              title="You earn votes by making predictions on markets. Each prediction earns XP, and your monthly vote allocation is based on your XP."
            >
              <Info className="w-4 h-4" />
            </span>
          </p>
        </div>

        {causes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No causes available yet</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {causes.map((cause) => {
              const total = localCauseTotals[cause.id] ?? cause.vote_count
              const pct = maxVotes > 0 ? (total / maxVotes) * 100 : 0
              const myVotes = localCauseVotes[cause.id] ?? 0

              return (
                <div
                  key={cause.id}
                  className={`bg-slate-800/50 border rounded-xl p-4 ${
                    myVotes > 0 ? 'border-emerald-500/50' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400">
                      {CATEGORY_LABELS[cause.category ?? ''] ?? cause.category ?? 'Other'}
                    </span>
                    {myVotes > 0 && (
                      <span className="text-xs text-emerald-400 font-medium">Your vote</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white">{cause.name}</h3>
                  {cause.organization && (
                    <p className="text-slate-400 text-sm mt-0.5">{cause.organization}</p>
                  )}
                  {cause.description && (
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cause.description}</p>
                  )}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{total} votes</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleVote(cause.id)}
                    disabled={!canVote || voting[cause.id]}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    Vote
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 3: Past Allocations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Past Allocations
        </h2>
        {totalDisbursed > 0 ? (
          <p className="text-slate-300">
            {formatCurrency(totalDisbursed)} MXN has been disbursed to community causes.
          </p>
        ) : (
          <p className="text-slate-400">
            The first Conscious Fund allocation will happen when we reach $10,000 MXN in sponsor
            contributions. Help us get there by sharing Crowd Conscious with brands you believe in.
          </p>
        )}
      </div>

      {/* Section 4: Sponsors Making It Possible */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-emerald-400" />
          Sponsors Making It Possible
        </h2>
        {sponsors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">Be the first sponsor</p>
            <Link
              href="/sponsor"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Sponsor a market <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sponsors.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
              >
                {s.sponsor_logo_url ? (
                  <img
                    src={s.sponsor_logo_url}
                    alt={s.sponsor_name ?? ''}
                    className="w-12 h-12 object-contain rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-500/20 rounded flex items-center justify-center">
                    <span className="text-amber-400 font-bold text-lg">
                      {s.sponsor_name?.[0] ?? '?'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">{s.sponsor_name}</p>
                  <p className="text-slate-400 text-sm">{s.title}</p>
                  <p className="text-slate-500 text-xs">
                    {formatCurrency(s.sponsor_contribution)} MXN contribution
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
