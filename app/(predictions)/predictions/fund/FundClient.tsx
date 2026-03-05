'use client'

import { useState } from 'react'
import { Heart, Wallet, ArrowUpCircle, ArrowDownCircle, Vote } from 'lucide-react'

type Fund = {
  current_balance: number
  total_collected: number
  total_disbursed: number
}

type Transaction = {
  id: string
  amount: number
  source_type: string
  description: string | null
  created_at: string
  prediction_markets: { id: string; title: string } | null
}

type Cause = {
  id: string
  name: string
  description: string | null
  organization: string | null
  category: string | null
  vote_count: number
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'trade_fee':
      return 'Sponsor fee'
    case 'donation':
      return 'Donation'
    case 'sponsorship':
      return 'Sponsorship'
    default:
      return source
  }
}

interface Props {
  fund: Fund
  transactions: Transaction[]
  userContribution: number
  causes?: Cause[]
  cycle?: string
  votePower?: number
  votesUsed?: number
  myVotesByCause?: Record<string, number>
  maxVotes?: number
  nextDisbursement?: string
}

export function FundClient({
  fund,
  transactions,
  userContribution,
  causes = [],
  cycle = '',
  votePower = 0,
  votesUsed = 0,
  myVotesByCause = {},
  maxVotes = 1,
  nextDisbursement = '',
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Conscious Fund</h1>
        <p className="text-slate-400 mt-1">
          Sponsor contributions fund solutions. Full transparency.
        </p>
      </div>

      {/* Fund overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Wallet className="w-5 h-5" />
            Current Balance
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(Number(fund.current_balance))} MXN
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <ArrowUpCircle className="w-5 h-5" />
            Total Collected
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(Number(fund.total_collected))} MXN
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <ArrowDownCircle className="w-5 h-5" />
            Total Disbursed
          </div>
          <p className="text-3xl font-bold text-amber-400">
            {formatCurrency(Number(fund.total_disbursed))} MXN
          </p>
        </div>
      </div>

      {/* Sponsor-funded impact */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4">
        <Heart className="w-10 h-10 text-emerald-400" />
        <div>
          <p className="text-sm text-slate-400">Sponsor-funded impact</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(userContribution)} MXN
          </p>
        </div>
      </div>

      {/* Transaction feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-white px-6 py-4 border-b border-slate-800">
          Recent Transactions
        </h2>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No transactions yet</p>
            <p className="text-sm mt-1">
              Fund grows from sponsor contributions.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">
                    {sourceLabel(tx.source_type)}
                    {tx.prediction_markets?.title && (
                      <span className="text-slate-400 font-normal">
                        {' '}
                        — {tx.prediction_markets.title}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(tx.created_at)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-emerald-400">
                    +{formatCurrency(Number(tx.amount))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cause voting */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Vote className="w-5 h-5 text-emerald-400" />
            ¿A dónde debe ir el fondo?
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Tu poder de voto: {localVotesUsed} de {votePower} votos usados
            {cycle && ` · Ciclo ${cycle}`}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Próximo desembolso: {nextDisbursement ? formatDate(nextDisbursement) : '—'}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            60% al primer lugar, 30% al segundo, 10% al tercero
          </p>
        </div>

        {causes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No hay causas disponibles aún</p>
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
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                >
                  <h3 className="font-semibold text-white">{cause.name}</h3>
                  {cause.organization && (
                    <p className="text-slate-400 text-sm mt-0.5">{cause.organization}</p>
                  )}
                  {cause.description && (
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{cause.description}</p>
                  )}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{total} votos</span>
                      {myVotes > 0 && (
                        <span className="text-emerald-400">Tus votos: {myVotes}</span>
                      )}
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
                    Vote ♥
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
