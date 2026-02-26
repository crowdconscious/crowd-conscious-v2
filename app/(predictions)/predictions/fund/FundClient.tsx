'use client'

import { Heart, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

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
      return 'Trade fee'
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
}

export function FundClient({
  fund,
  transactions,
  userContribution,
}: Props) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Conscious Fund</h1>
        <p className="text-slate-400 mt-1">
          Every trade funds solutions. Full transparency.
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

      {/* Your contribution */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4">
        <Heart className="w-10 h-10 text-emerald-400" />
        <div>
          <p className="text-sm text-slate-400">Your contributions from trades</p>
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
              Fund grows from trade fees. Start trading to contribute.
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

      {/* Future: grant allocation placeholder */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
        <p className="text-slate-400">
          Coming soon: Vote on which organizations receive grants from the
          Conscious Fund
        </p>
      </div>
    </div>
  )
}
