'use client'

import { useEffect, useState } from 'react'
import { createClientAuth } from '@/lib/auth'
import Link from 'next/link'

interface Sponsorship {
  id: string
  amount: number
  sponsor_type: 'individual' | 'business'
  brand_name?: string
  brand_logo_url?: string
  status: string
  created_at: string
  paid_at?: string
  content_id: string
  content?: {
    title: string
    community_name: string
  }
}

export default function MySponsorships({ userId }: { userId: string }) {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'individual' | 'business'>('all')

  const supabase = createClientAuth()

  useEffect(() => {
    fetchSponsorships()
  }, [userId])

  const fetchSponsorships = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsorships')
        .select(`
          *,
          content:community_content(title, community_id),
          community:communities!inner(name)
        `)
        .eq('sponsor_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to include community name
      const transformedData: Sponsorship[] = (data || []).map((s: any) => ({
        ...s,
        content: {
          title: s.content?.title || 'Unknown Content',
          community_name: s.community?.name || 'Unknown Community'
        }
      }))

      setSponsorships(transformedData)
    } catch (error) {
      console.error('Error fetching sponsorships:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSponsors = sponsorships.filter(s => {
    if (filter === 'all') return true
    return s.sponsor_type === filter
  })

  const totalSponsored = sponsorships
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  const businessSponsors = sponsorships.filter(s => s.sponsor_type === 'business' && s.status === 'paid')
  const individualSponsors = sponsorships.filter(s => s.sponsor_type === 'individual' && s.status === 'paid')

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-32 bg-slate-200 rounded"></div>
        <div className="h-32 bg-slate-200 rounded"></div>
      </div>
    )
  }

  if (sponsorships.length === 0) {
    return (
      <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">💝</div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          No Sponsorships Yet
        </h3>
        <p className="text-slate-600 mb-6">
          Start making an impact by sponsoring community needs
        </p>
        <Link href="/communities">
          <button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            Browse Communities
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">My Sponsorships</h2>
        <div className="text-right">
          <div className="text-sm text-slate-600">Total Sponsored</div>
          <div className="text-2xl font-bold text-teal-600">
            ${totalSponsored.toLocaleString()} MXN
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center text-2xl">
              💰
            </div>
            <div>
              <div className="text-sm text-slate-600">Total Sponsorships</div>
              <div className="text-xl font-bold text-slate-900">
                {sponsorships.filter(s => s.status === 'paid').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <div className="text-sm text-slate-600">As Individual</div>
              <div className="text-xl font-bold text-slate-900">
                {individualSponsors.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              🏢
            </div>
            <div>
              <div className="text-sm text-slate-600">As Business</div>
              <div className="text-xl font-bold text-slate-900">
                {businessSponsors.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({sponsorships.length})
        </button>
        <button
          onClick={() => setFilter('individual')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'individual'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          👤 Individual ({individualSponsors.length})
        </button>
        <button
          onClick={() => setFilter('business')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'business'
              ? 'bg-teal-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          🏢 Business ({businessSponsors.length})
        </button>
      </div>

      {/* Sponsorships List */}
      <div className="space-y-3">
        {filteredSponsors.map((sponsorship) => (
          <div
            key={sponsorship.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              {/* Logo or Icon */}
              {sponsorship.sponsor_type === 'business' && sponsorship.brand_logo_url ? (
                <img
                  src={sponsorship.brand_logo_url}
                  alt={sponsorship.brand_name || 'Brand logo'}
                  className="w-16 h-16 object-contain rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg flex items-center justify-center text-3xl">
                  {sponsorship.sponsor_type === 'business' ? '🏢' : '👤'}
                </div>
              )}

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {sponsorship.content?.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {sponsorship.content?.community_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-teal-600">
                      ${sponsorship.amount.toLocaleString()} MXN
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        sponsorship.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {sponsorship.status === 'paid' ? '✓ Paid' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>
                    {sponsorship.sponsor_type === 'business' ? '🏢' : '👤'}{' '}
                    {sponsorship.sponsor_type === 'business'
                      ? sponsorship.brand_name
                      : 'Individual'}
                  </span>
                  <span>
                    📅{' '}
                    {new Date(sponsorship.paid_at || sponsorship.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3">
                  <Link href={`/communities/${sponsorship.content_id}`}>
                    <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                      View Content →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSponsors.length === 0 && (
        <div className="text-center py-8 text-slate-600">
          No {filter} sponsorships found
        </div>
      )}
    </div>
  )
}
