'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wallet, ArrowLeft } from 'lucide-react'

function formatCurrency(num: number): string {
  return `$${num.toFixed(2)}`
}

export default function PredictionsWalletPage() {
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/predictions/wallet')
      .then((r) => r.json())
      .then((d) => {
        setWallet(d.wallet ?? null)
      })
      .catch(() => setWallet(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-md mx-auto">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to markets
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Prediction Wallet
        </h1>

        {loading ? (
          <div className="h-24 bg-slate-800 rounded animate-pulse" />
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-1">Available balance</p>
            <p className="text-3xl font-bold text-emerald-400">
              {wallet ? formatCurrency(wallet.balance) : '$0.00'}
            </p>
            <p className="text-slate-500 text-xs mt-2">{wallet?.currency || 'MXN'}</p>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-400 text-sm">
                Deposit functionality coming soon. For now, you can trade with test funds once they are seeded.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
