'use client'

import { useState, useEffect } from 'react'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'
import { Wallet, TrendingUp, DollarSign } from 'lucide-react'

interface CommunityTreasuryProps {
  communityId: string
  communityName: string
  userRole?: string
}

interface TreasuryStats {
  balance: number
  total_donations: number
  total_spent: number
  donation_count: number
  sponsorship_count: number
  recent_transactions: Array<{
    id: string
    type: string
    amount: number
    description: string
    created_at: string
    donor_name?: string
  }>
  userRole?: string
}

interface WalletData {
  id: string
  balance: number
  currency: string
  status: string
  recentTransactions: Array<{
    id: string
    type: 'credit' | 'debit'
    amount: number
    source: string
    description: string
    created_at: string
  }>
  moduleRevenue?: {
    total: number
    moduleCount: number
    salesCount: number
  }
}

export default function CommunityTreasury({
  communityId,
  communityName,
  userRole
}: CommunityTreasuryProps) {
  const [stats, setStats] = useState<TreasuryStats | null>(null)
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [donationAmount, setDonationAmount] = useState<string>('')
  const [donating, setDonating] = useState(false)
  const [showDonateForm, setShowDonateForm] = useState(false)

  useEffect(() => {
    fetchTreasuryStats()
    fetchWalletData()
  }, [communityId])

  const fetchTreasuryStats = async () => {
    try {
      const response = await fetch(`/api/treasury/stats?communityId=${communityId}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching treasury stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWalletData = async () => {
    try {
      // Get or create wallet for this community
      const createResponse = await fetch('/api/wallets/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId })
      })
      
      if (createResponse.ok) {
        const { wallet } = await createResponse.json()
        
        // Fetch full wallet details
        const detailsResponse = await fetch(`/api/wallets/${wallet.id}`)
        if (detailsResponse.ok) {
          const walletDetails = await detailsResponse.json()
          setWalletData(walletDetails)
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    }
  }

  const handleDonate = async () => {
    const amount = parseFloat(donationAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setDonating(true)
    try {
      const response = await fetch('/api/treasury/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId,
          amount,
          communityName
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to process donation')
      }
    } catch (error) {
      console.error('Donation error:', error)
      alert('Failed to process donation')
    } finally {
      setDonating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AnimatedCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </AnimatedCard>
    )
  }

  if (!stats) {
    return null
  }

  const isAdmin = userRole === 'admin' || userRole === 'moderator' || stats.userRole === 'admin' || stats.userRole === 'moderator'

  return (
    <div className="space-y-6">
      {/* Treasury Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-teal-600" />
          Community Wallet
        </h2>
        <p className="text-slate-600">
          Unified wallet combining donations, sponsorships, and module sales revenue. Use these funds to sponsor community needs and grow your impact.
        </p>
      </div>

      {/* Wallet Balance Overview */}
      {walletData && (
        <AnimatedCard className="bg-gradient-to-br from-teal-50 via-green-50 to-teal-50 border-2 border-teal-200">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-teal-700 mb-1">Total Wallet Balance</p>
                <p className="text-4xl font-bold text-teal-900">{formatCurrency(walletData.balance)}</p>
                <p className="text-xs text-teal-600 mt-1">
                  {walletData.currency} • {walletData.status === 'active' ? '✅ Active' : '⚠️ ' + walletData.status}
                </p>
              </div>
              {walletData.moduleRevenue && walletData.moduleRevenue.total > 0 && (
                <div className="text-right bg-white/60 rounded-lg p-3">
                  <p className="text-xs text-teal-600 mb-1">Module Sales Revenue</p>
                  <p className="text-xl font-bold text-teal-900">{formatCurrency(walletData.moduleRevenue.total)}</p>
                  <p className="text-xs text-teal-600 mt-1">
                    {walletData.moduleRevenue.salesCount} sales • {walletData.moduleRevenue.moduleCount} modules
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💝</span>
                  <div>
                    <p className="text-sm text-slate-600">Donations</p>
                    <p className="text-xl font-bold text-slate-900">{stats.donation_count}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm text-slate-600">Sponsorships</p>
                    <p className="text-xl font-bold text-slate-900">{stats.sponsorship_count}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Balance Card (if wallet not loaded yet) */}
      {!walletData && (
        <AnimatedCard className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Current Balance</p>
                <p className="text-4xl font-bold text-green-900">{formatCurrency(stats.balance)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600 mb-1">Total Donated</p>
                <p className="text-lg font-semibold text-green-800">{formatCurrency(stats.total_donations)}</p>
                <p className="text-xs text-green-600 mt-2">Total Spent</p>
                <p className="text-lg font-semibold text-green-800">{formatCurrency(stats.total_spent)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💝</span>
                  <div>
                    <p className="text-sm text-slate-600">Donations</p>
                    <p className="text-xl font-bold text-slate-900">{stats.donation_count}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm text-slate-600">Sponsorships</p>
                    <p className="text-xl font-bold text-slate-900">{stats.sponsorship_count}</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Donate Button */}
      <AnimatedCard>
        <div className="p-6">
          {!showDonateForm ? (
            <AnimatedButton
              onClick={() => setShowDonateForm(true)}
              variant="primary"
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              💸 Donate to Community Wallet
            </AnimatedButton>
          ) : (
            <div className="space-y-4 bg-white rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Donation Amount (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="100"
                    min="10"
                    step="10"
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[50, 100, 250, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setDonationAmount(amount.toString())}
                      className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <AnimatedButton
                  onClick={handleDonate}
                  variant="primary"
                  disabled={donating || !donationAmount}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {donating ? 'Processing...' : 'Donate Now'}
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => {
                    setShowDonateForm(false)
                    setDonationAmount('')
                  }}
                  variant="ghost"
                >
                  Cancel
                </AnimatedButton>
              </div>

              <p className="text-xs text-slate-500">
                💡 Your donation will be added to the community wallet and can be used to sponsor community needs and initiatives.
              </p>
            </div>
          )}
        </div>
      </AnimatedCard>

      {/* Admin Controls */}
      {isAdmin && stats.balance > 0 && (
        <AnimatedCard className="bg-amber-50 border-2 border-amber-200">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg">👑</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Admin Controls</h3>
                <p className="text-sm text-amber-700 mb-3">
                  As a community admin, you can use wallet funds to sponsor needs on behalf of the community.
                </p>
                <p className="text-xs text-amber-600">
                  💡 When sponsoring a need, you'll have the option to use funds from the community wallet instead of personal payment.
                </p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Recent Transactions */}
      {stats.recent_transactions && stats.recent_transactions.length > 0 && (
        <AnimatedCard>
          <div className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">📜 Recent Transactions</h3>
            <div className="space-y-3">
              {stats.recent_transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'donation' 
                        ? 'bg-green-100' 
                        : 'bg-blue-100'
                    }`}>
                      <span className="text-lg">
                        {tx.type === 'donation' ? '💝' : '🎯'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {tx.type === 'donation' ? 'Donation' : 'Sponsorship'}
                        {tx.donor_name && tx.type === 'donation' && (
                          <span className="text-slate-600"> from {tx.donor_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.type === 'donation' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {tx.type === 'donation' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* How It Works */}
      <AnimatedCard className="bg-slate-50">
        <div className="p-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span>❓</span>
            <span>How the Community Wallet Works</span>
          </h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex gap-2">
              <span>1️⃣</span>
              <p><strong>Multiple revenue streams</strong> - donations, sponsorships, and module sales</p>
            </div>
            <div className="flex gap-2">
              <span>2️⃣</span>
              <p><strong>Unified balance</strong> - all funds in one secure wallet</p>
            </div>
            <div className="flex gap-2">
              <span>3️⃣</span>
              <p><strong>Community control</strong> - admins decide how to use funds</p>
            </div>
            <div className="flex gap-2">
              <span>4️⃣</span>
              <p><strong>Transparent tracking</strong> - every transaction is recorded</p>
            </div>
            <div className="flex gap-2">
              <span>5️⃣</span>
              <p><strong>Impact amplification</strong> - funds power real community projects</p>
            </div>
          </div>

          {walletData && walletData.moduleRevenue && walletData.moduleRevenue.total > 0 && (
            <div className="mt-4 p-3 bg-teal-100 border border-teal-200 rounded-lg">
              <p className="text-sm font-semibold text-teal-900 mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Module Creator Earnings
              </p>
              <p className="text-xs text-teal-700">
                This community has earned {formatCurrency(walletData.moduleRevenue.total)} from {walletData.moduleRevenue.salesCount} module sales. 
                These funds can be reinvested into more community projects, creating a sustainable impact cycle.
              </p>
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  )
}

