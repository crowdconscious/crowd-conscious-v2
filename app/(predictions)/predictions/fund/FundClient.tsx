'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Vote, Sparkles, Users, ArrowRight, Info } from 'lucide-react'
import {
  TransparencyDashboard,
  type SponsorshipLogPublic,
  type CauseBreakdownRow,
} from '@/components/fund/TransparencyDashboard'

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
  sponsorshipLogs: SponsorshipLogPublic[]
  sponsorshipLogTotal: number
  causesBreakdown: CauseBreakdownRow[]
  isAuthenticated?: boolean
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
  sponsorshipLogs = [],
  sponsorshipLogTotal = 0,
  causesBreakdown = [],
  isAuthenticated = true,
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
        <h1 className="text-3xl font-bold text-white">Fondo Consciente</h1>
        <p className="text-cc-text-secondary mt-2 text-lg">
          Impulsado por patrocinadores. Dirigido por ti.
        </p>
        <p className="text-cc-text-muted mt-2 text-sm max-w-2xl">
          Cuando las marcas patrocinan mercados de predicción en Crowd Conscious, entre el 20% y hasta el
          40% de la parte neta de cada patrocinio (según el nivel) va al Fondo Consciente, además de
          las aportaciones por comisiones de operación. Los usuarios votan qué causas comunitarias
          reciben apoyos cada mes.
        </p>
        {!isAuthenticated && (
          <Link
            href="/signup"
            className="inline-block mt-4 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
          >
            Regístrate para votar por causas
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cc-card border border-emerald-500/20 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Total Fund</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalFund)} MXN
          </p>
          <p className="text-cc-text-muted text-xs mt-1">
            From sponsorships (up to 40% of net by tier) + trade fees
          </p>
        </div>
        <div className="bg-cc-card border border-emerald-500/20 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Causes Supported</p>
          <p className="text-2xl font-bold text-white">{causesSupported}</p>
        </div>
        <div className="bg-cc-card border border-emerald-500/20 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Monthly Allocation</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(monthlyAllocation)} MXN
          </p>
        </div>
        <div className="bg-cc-card border border-emerald-500/20 rounded-xl p-6">
          <p className="text-gray-400 text-sm mb-1">Your Impact</p>
          <p className="text-2xl font-bold text-white">{yourImpactXp} XP</p>
          <p className="text-cc-text-muted text-xs mt-1">From predictions</p>
        </div>
      </div>

      {/* Section 2: Vote for Causes */}
      <div className="bg-cc-card border border-cc-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-cc-border">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Vote className="w-5 h-5 text-emerald-400" />
            Vota por causas
          </h2>
          <p className="text-cc-text-secondary text-sm mt-1 flex items-center gap-1.5">
            {isAuthenticated
              ? `Te quedan ${votePower - localVotesUsed} voto${votePower - localVotesUsed !== 1 ? 's' : ''} este mes`
              : 'Regístrate para votar y dirigir los fondos a causas comunitarias'}
            {cycle && ` · Ciclo ${cycle}`}
            <span
              className="inline-flex text-cc-text-muted hover:text-gray-400 cursor-help"
              title="You earn votes by making predictions on markets. Each prediction earns XP, and your monthly vote allocation is based on your XP."
            >
              <Info className="w-4 h-4" />
            </span>
          </p>
        </div>

        {causes.length === 0 ? (
          <div className="p-12 text-center text-cc-text-secondary">
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
                  className={`bg-cc-card border rounded-xl p-4 ${
                    myVotes > 0 ? 'border-emerald-500/40' : 'border-cc-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-cc-text-secondary">
                      {CATEGORY_LABELS[cause.category ?? ''] ?? cause.category ?? 'Other'}
                    </span>
                    {myVotes > 0 && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-medium">
                        Your vote
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white">{cause.name}</h3>
                  {cause.organization && (
                    <p className="text-cc-text-secondary text-sm mt-0.5">{cause.organization}</p>
                  )}
                  {cause.description && (
                    <p className="text-cc-text-muted text-xs mt-1 line-clamp-2">{cause.description}</p>
                  )}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-cc-text-secondary mb-1">
                      <span>{total} votes</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                  {isAuthenticated ? (
                    <button
                      onClick={() => handleVote(cause.id)}
                      disabled={!canVote || voting[cause.id]}
                      className="mt-3 w-full py-2 px-3 rounded-lg border border-cc-border text-gray-300 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-transparent"
                    >
                      <Heart className="w-4 h-4" />
                      Votar
                    </button>
                  ) : (
                    <Link
                      href="/signup"
                      className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      Regístrate para votar
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TransparencyDashboard
        sponsorships={sponsorshipLogs}
        sponsorshipTotalCount={sponsorshipLogTotal}
        totalDistributed={totalDisbursed}
        causesSupported={causesSupported}
        causesBreakdown={causesBreakdown}
      />

      {/* Section 3: Past Allocations */}
      <div className="bg-cc-card border border-cc-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Past Allocations
        </h2>
        {totalDisbursed > 0 ? (
          <p className="text-gray-300">
            {formatCurrency(totalDisbursed)} MXN has been disbursed to community causes.
          </p>
        ) : (
          <p className="text-cc-text-secondary">
            The first Conscious Fund allocation will happen when we reach $10,000 MXN in sponsor
            contributions. Help us get there by sharing Crowd Conscious with brands you believe in.
          </p>
        )}
      </div>

      {/* Section 4: Sponsors Making It Possible */}
      <div className="bg-cc-card border border-cc-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-emerald-400" />
          Sponsors Making It Possible
        </h2>
        {sponsors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-cc-text-secondary mb-4">Be the first sponsor</p>
            <Link
              href="/pulse"
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
                className="flex items-center gap-4 p-4 bg-cc-bg/50 border border-cc-border rounded-xl"
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
                  <p className="text-cc-text-secondary text-sm">{s.title}</p>
                  <p className="text-cc-text-muted text-xs">
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
