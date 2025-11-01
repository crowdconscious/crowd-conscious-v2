'use client'

import { useEffect, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, Clock, DollarSign, ArrowUpRight, Download } from 'lucide-react'

interface WalletData {
  id: string
  owner_type: 'community' | 'user' | 'platform'
  owner_id: string | null
  balance: number
  currency: string
  status: string
  created_at: string
  updated_at: string
}

interface Transaction {
  id: string
  wallet_id: string
  type: 'credit' | 'debit'
  amount: number
  source: string
  description: string
  status: string
  created_at: string
}

interface WalletCardProps {
  walletId?: string
  ownerType: 'community' | 'user'
  ownerId?: string
  showTransactions?: boolean
  compact?: boolean
}

export default function WalletCard({ 
  walletId,
  ownerType,
  ownerId,
  showTransactions = true,
  compact = false
}: WalletCardProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (walletId) {
      fetchWalletById(walletId)
    } else if (ownerType && ownerId) {
      fetchOrCreateWallet()
    }
  }, [walletId, ownerType, ownerId])

  const fetchWalletById = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/wallets/${id}`)
      if (!response.ok) throw new Error('Failed to fetch wallet')
      
      const data = await response.json()
      setWallet(data.wallet)
      setTransactions(data.recentTransactions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrCreateWallet = async () => {
    try {
      setLoading(true)
      const endpoint = ownerType === 'community' 
        ? '/api/wallets/community' 
        : '/api/wallets/user'
      
      const body = ownerType === 'community' 
        ? { communityId: ownerId } 
        : {}

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error('Failed to fetch wallet')
      
      const data = await response.json()
      setWallet(data.wallet)
      
      // Fetch transactions separately
      if (data.wallet?.id) {
        const transResponse = await fetch(`/api/wallets/${data.wallet.id}/transactions?limit=5`)
        if (transResponse.ok) {
          const transData = await transResponse.json()
          setTransactions(transData.transactions || [])
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'module_sale': 'Venta de Módulo',
      'need_sponsorship': 'Patrocinio de Necesidad',
      'creator_donation': 'Donación de Creador',
      'withdrawal': 'Retiro',
      'refund': 'Reembolso'
    }
    return labels[source] || source
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-slate-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
        <p className="text-red-700 font-medium">Error: {error}</p>
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-6">
        <p className="text-slate-600">No se encontró la billetera</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-teal-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Balance Disponible</span>
          </div>
          {wallet.status === 'active' && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Activo</span>
          )}
        </div>
        <div className="text-3xl font-bold">
          {formatCurrency(wallet.balance, wallet.currency)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-br from-teal-600 to-purple-600 rounded-xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold opacity-90">
                {ownerType === 'community' ? 'Billetera de Comunidad' : 'Billetera Personal'}
              </h3>
              <p className="text-sm opacity-75">
                {wallet.status === 'active' ? 'Activo' : wallet.status}
              </p>
            </div>
          </div>
          <DollarSign className="w-8 h-8 opacity-50" />
        </div>

        <div className="mb-6">
          <p className="text-sm opacity-75 mb-1">Balance Disponible</p>
          <div className="text-4xl sm:text-5xl font-bold">
            {formatCurrency(wallet.balance, wallet.currency)}
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Retirar Fondos
          </button>
          <button className="flex-1 bg-white text-teal-600 hover:bg-slate-100 transition-colors px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Ver Todo
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      {showTransactions && transactions.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg text-slate-900">Transacciones Recientes</h4>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'credit' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {getSourceLabel(transaction.source)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {transaction.description || formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${
                  transaction.type === 'credit' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  <p className="font-bold text-sm">
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount, wallet.currency)}
                  </p>
                  <p className="text-xs opacity-75">
                    {transaction.status}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No hay transacciones recientes</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

