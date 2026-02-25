'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']
type PredictionPosition = Database['public']['Tables']['prediction_positions']['Row']

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`
  return `$${vol.toFixed(0)}`
}

interface TradePanelProps {
  market: PredictionMarket
  onTradeSuccess?: (xpGained?: number) => void
}

export function TradePanel({ market, onTradeSuccess }: TradePanelProps) {
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [wallet, setWallet] = useState<{ balance: number } | null>(null)
  const [positions, setPositions] = useState<PredictionPosition[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/predictions/wallet').then((r) => r.json()),
      fetch(`/api/predictions/positions?market_id=${market.id}`).then((r) => r.json()),
    ]).then(([walletRes, positionsRes]) => {
      setWallet(walletRes.wallet ?? null)
      setPositions(positionsRes.positions ?? [])
      setLoadingData(false)
    })
  }, [market.id])

  const minTrade = Number(market.min_trade)
  const prob = Number(market.current_probability)
  const price = side === 'yes' ? prob / 100 : (100 - prob) / 100
  const numAmount = parseFloat(amount) || 0
  const shares = price > 0 ? numAmount / price : 0
  const feeAmount = numAmount * (Number(market.fee_percentage) / 100)
  const consciousAmount = numAmount * (Number(market.conscious_fund_percentage) / 100)
  const estimatedPayout = shares * 1.0
  const balance = wallet?.balance ?? 0
  const hasBalance = balance >= numAmount + feeAmount + consciousAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount < minTrade || !hasBalance) return

    setLoading(true)
    try {
      const res = await fetch('/api/predictions/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: market.id,
          side,
          amount: numAmount,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setAmount('')
        onTradeSuccess?.(data.xpGained)
        window.location.reload()
      } else {
        alert(data.error || 'Trade failed')
      }
    } catch (err) {
      alert('Trade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const yesPosition = positions.find((p) => p.side === 'yes')
  const noPosition = positions.find((p) => p.side === 'no')

  if (loadingData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/2 mb-4" />
        <div className="h-12 bg-slate-700 rounded mb-4" />
        <div className="h-24 bg-slate-700 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">Trade</h3>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide('yes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            side === 'yes'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          BUY YES
        </button>
        <button
          onClick={() => setSide('no')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            side === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          BUY NO
        </button>
      </div>

      {balance <= 0 ? (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm mb-3">Deposit funds to trade</p>
          <Link
            href="/predictions/wallet"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Deposit funds first
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount (MXN)
            </label>
            <input
              type="number"
              min={minTrade}
              step="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${minTrade}`}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {numAmount >= minTrade && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-300">
                You get ~{shares.toFixed(0)} shares at {(price * 100).toFixed(0)}¢ per share
              </p>
              <p className="text-slate-400">
                Estimated payout if correct: {formatVolume(estimatedPayout)}
              </p>
              <p className="text-slate-500">
                Platform fee: {formatVolume(feeAmount)} | Conscious Fund: {formatVolume(consciousAmount)}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || numAmount < minTrade || !hasBalance}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Trading...' : 'Trade'}
          </button>
        </form>
      )}

      {(yesPosition || noPosition) && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-slate-400 text-sm font-medium mb-2">Your position</p>
          <div className="space-y-1 text-sm">
            {yesPosition && Number(yesPosition.shares) > 0 && (
              <p className="text-emerald-400">
                YES: {Number(yesPosition.shares).toFixed(0)} shares @ {(Number(yesPosition.average_price) * 100).toFixed(0)}¢
              </p>
            )}
            {noPosition && Number(noPosition.shares) > 0 && (
              <p className="text-red-400">
                NO: {Number(noPosition.shares).toFixed(0)} shares @ {((1 - Number(noPosition.average_price)) * 100).toFixed(0)}¢
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
