'use client'

import { useEffect, useState } from 'react'
import { createClientAuth } from '@/lib/auth'
import Link from 'next/link'

interface Sponsor {
  id: string
  amount: number
  sponsor_type: 'individual' | 'business'
  display_name: string
  brand_name?: string
  brand_logo_url?: string
  brand_website?: string
  message?: string
  created_at: string
}

interface SponsorDisplayProps {
  contentId: string
  showAll?: boolean
}

export default function SponsorDisplay({ contentId, showAll = false }: SponsorDisplayProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAmount, setTotalAmount] = useState(0)

  const supabase = createClientAuth()

  useEffect(() => {
    fetchSponsors()
  }, [contentId])

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsorships')
        .select('*')
        .eq('content_id', contentId)
        .eq('status', 'paid')
        .order('amount', { ascending: false })

      if (error) throw error

      const sponsors = (data || []) as Sponsor[]
      setSponsors(sponsors)
      
      // Calculate total
      const total = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0)
      setTotalAmount(total)
    } catch (error) {
      console.error('Error fetching sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSponsorTier = (amount: number) => {
    if (amount >= 5000) return { name: 'Gold', color: 'text-yellow-600', icon: '🥇' }
    if (amount >= 1000) return { name: 'Silver', color: 'text-slate-600', icon: '🥈' }
    return { name: 'Bronze', color: 'text-orange-600', icon: '🥉' }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-20 bg-slate-200 rounded"></div>
      </div>
    )
  }

  if (sponsors.length === 0) {
    return null
  }

  const displaySponsors = showAll ? sponsors : sponsors.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Sponsors ({sponsors.length})
        </h3>
        <div className="text-sm text-slate-600">
          Total: <span className="font-semibold text-teal-600">${totalAmount.toLocaleString()} MXN</span>
        </div>
      </div>

      {/* Sponsor List */}
      <div className="space-y-3">
        {displaySponsors.map((sponsor) => {
          const tier = getSponsorTier(sponsor.amount)
          const isBusiness = sponsor.sponsor_type === 'business'
          const hasLogo = isBusiness && sponsor.brand_logo_url && sponsor.amount >= 1000

          return (
            <div
              key={sponsor.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Logo or Icon */}
                {hasLogo ? (
                  <img
                    src={sponsor.brand_logo_url}
                    alt={sponsor.brand_name || 'Sponsor logo'}
                    className="w-16 h-16 object-contain rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg flex items-center justify-center text-3xl">
                    {isBusiness ? '🏢' : '👤'}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-slate-900 truncate`}>
                      {isBusiness ? sponsor.brand_name : sponsor.display_name}
                    </span>
                    <span className={`text-xs ${tier.color} font-medium`}>
                      {tier.icon} {tier.name}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600 mb-2">
                    Sponsored ${sponsor.amount.toLocaleString()} MXN
                  </div>

                  {sponsor.message && (
                    <p className="text-sm text-slate-700 italic line-clamp-2">
                      "{sponsor.message}"
                    </p>
                  )}

                  {/* Website Link for Gold Sponsors */}
                  {isBusiness && sponsor.brand_website && sponsor.amount >= 5000 && (
                    <a
                      href={sponsor.brand_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      Visit Website →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Show More */}
      {!showAll && sponsors.length > 3 && (
        <button
          onClick={() => {/* Implement modal or expand */}}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          View all {sponsors.length} sponsors →
        </button>
      )}
    </div>
  )
}
