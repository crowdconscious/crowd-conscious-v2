'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Wallet, ArrowLeft } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function formatCurrency(num: number): string {
  return `$${num.toFixed(2)}`
}

function DepositForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [amount, setAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 50 || numAmount > 500000) {
      onError('Amount must be between 50 and 500,000 MXN')
      return
    }

    setIsProcessing(true)
    onError('')

    try {
      const res = await fetch('/api/predictions/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, payment_method: 'stripe' }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create deposit')
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Card element not found')

      const { error } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      })

      if (error) throw new Error(error.message || 'Payment failed')
      onSuccess()
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Deposit failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Amount (MXN)</label>
        <input
          type="number"
          min={50}
          max={500000}
          step={10}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50 - 500,000"
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          disabled={isProcessing}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Card</label>
        <div className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#e2e8f0',
                  '::placeholder': { color: '#64748b' },
                },
              },
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || isProcessing || !amount}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isProcessing ? 'Processing...' : amount ? `Deposit $${parseFloat(amount).toFixed(2)} MXN` : 'Enter amount'}
      </button>
    </form>
  )
}

export default function PredictionsWalletPage() {
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositError, setDepositError] = useState('')
  const [depositSuccess, setDepositSuccess] = useState(false)

  const refetch = () =>
    fetch('/api/predictions/wallet')
      .then((r) => r.json())
      .then((d) => setWallet(d.wallet ?? null))
      .catch(() => setWallet(null))

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [])

  const handleDepositSuccess = () => {
    setDepositSuccess(true)
    setDepositError('')
    refetch()
    setTimeout(() => setDepositSuccess(false), 4000)
  }

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

            <div className="mt-6 pt-6 border-t border-slate-800">
              <h2 className="text-lg font-semibold text-white mb-4">Deposit funds</h2>
              {depositSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm">
                  Deposit successful. Your balance will update shortly.
                </div>
              )}
              {depositError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {depositError}
                </div>
              )}
              <Elements stripe={stripePromise}>
                <DepositForm onSuccess={handleDepositSuccess} onError={setDepositError} />
              </Elements>
              <p className="mt-3 text-xs text-slate-500">
                Min 50 MXN, max 500,000 MXN. Funds are credited after payment confirmation.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
