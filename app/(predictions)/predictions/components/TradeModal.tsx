'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Database } from '@/types/database'
import { toDisplayPercent } from '@/lib/probability-utils'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']

const SHARE_PAYOUT = 10

function formatCurrency(num: number): string {
  return `$${num.toFixed(2)}`
}

interface TradeModalProps {
  market: PredictionMarket
  side: 'yes' | 'no'
  isOpen: boolean
  onClose: () => void
}

export function TradeModal({ market, side, isOpen, onClose }: TradeModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const minTrade = Number(market.min_trade)
  const prob = toDisplayPercent(Number(market.current_probability))
  const pricePerShare = side === 'yes' ? (prob / 100) * 10 : ((100 - prob) / 100) * 10
  const numAmount = parseFloat(amount) || 0
  const feeAmount = numAmount * (Number(market.fee_percentage) / 100)
  const consciousAmount = numAmount * (Number(market.conscious_fund_percentage) / 100)
  const netAmount = numAmount - feeAmount - consciousAmount
  const shares = pricePerShare > 0 ? netAmount / pricePerShare : 0
  const potentialPayout = shares * SHARE_PAYOUT
  const totalCost = numAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < minTrade) return

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
        onClose()
        setAmount('')
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Trade {side === 'yes' ? 'YES' : 'NO'} — {market.title.slice(0, 50)}
            {market.title.length > 50 ? '...' : ''}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            <div className="space-y-2 text-sm p-3 bg-slate-800/50 rounded-lg">
              <p className="text-white font-medium">
                You&apos;re buying {shares.toFixed(2)} {side.toUpperCase()} shares at {formatCurrency(pricePerShare)} each
              </p>
              <p className="text-emerald-400">
                If {side.toUpperCase()} wins, you receive: {formatCurrency(potentialPayout)} ({shares.toFixed(2)} × ${SHARE_PAYOUT})
              </p>
              <p className="text-slate-400">
                Platform fee: {formatCurrency(feeAmount)} | Conscious Fund: {formatCurrency(consciousAmount)}
              </p>
              <p className="text-slate-300 font-medium">
                Total cost: {formatCurrency(totalCost)}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || numAmount < minTrade}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Trading...' : 'Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
