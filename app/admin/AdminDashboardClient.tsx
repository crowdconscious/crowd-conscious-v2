'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'
import Link from 'next/link'
import { Wallet, ShoppingCart, Building2, Users, FileText, Home } from 'lucide-react'

interface AdminData {
  communities: Array<{
    id: string
    name: string
    slug: string
    member_count: number
    created_at: string
    creator_id: string
  }>
  content: Array<{
    id: string
    title: string
    type: string
    status: string
    created_at: string
    community_id: string
    communities: { name: string }
  }>
  users: Array<{
    id: string
    email: string
    full_name: string
    user_type: string
    created_at: string
  }>
}

type Tab = 'overview' | 'corporate' | 'marketplace' | 'wallets'

export default function AdminDashboardClient() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const supabase = createClientAuth()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin')
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch admin data')
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
      setError('Failed to fetch admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (type: 'community' | 'content', id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}: "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(id)
      const response = await fetch(`/api/admin?type=${type}&id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok) {
        // Refresh data
        await fetchAdminData()
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`)
      } else {
        alert(result.error || `Failed to delete ${type}`)
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      alert(`Failed to delete ${type}`)
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-4 bg-slate-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchAdminData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-600 mt-2">Manage communities, content, users, and marketplace</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/email-test"
                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              >
                📧 Test Emails
              </Link>
              <Link
                href="/dashboard"
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Home className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('corporate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'corporate'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Corporate Training
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('wallets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'wallets'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Wallets & Treasury
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab 
            data={data} 
            deleting={deleting}
            onDelete={handleDelete}
            formatDate={formatDate}
          />
        )}
        {activeTab === 'corporate' && <CorporateTab />}
        {activeTab === 'marketplace' && <MarketplaceTab />}
        {activeTab === 'wallets' && <WalletsTab />}
      </div>
    </div>
  )
}

// Overview Tab Component (original content)
function OverviewTab({ 
  data, 
  deleting, 
  onDelete, 
  formatDate 
}: { 
  data: AdminData | null
  deleting: string | null
  onDelete: (type: 'community' | 'content', id: string, name: string) => void
  formatDate: (dateString: string) => string
}) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Communities</h3>
          <p className="text-3xl font-bold text-teal-600">{data?.communities.length || 0}</p>
          <p className="text-sm text-slate-500 mt-1">Total communities</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Content</h3>
          <p className="text-3xl font-bold text-blue-600">{data?.content.length || 0}</p>
          <p className="text-sm text-slate-500 mt-1">Total content items</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Users</h3>
          <p className="text-3xl font-bold text-purple-600">{data?.users.length || 0}</p>
          <p className="text-sm text-slate-500 mt-1">Total users</p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Communities */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Recent Communities</h2>
          </div>
          <div className="p-6">
            {data?.communities.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No communities found</p>
            ) : (
              <div className="space-y-4">
                {data?.communities.slice(0, 10).map((community) => (
                  <div key={community.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{community.name}</h3>
                      <p className="text-sm text-slate-500">
                        {community.member_count} members • Created {formatDate(community.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/communities/${community.id}`}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => onDelete('community', community.id, community.name)}
                        disabled={deleting === community.id}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {deleting === community.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Recent Content</h2>
          </div>
          <div className="p-6">
            {data?.content.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No content found</p>
            ) : (
              <div className="space-y-4">
                {data?.content.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-500">
                        {item.type} • {item.status} • {item.communities.name} • {formatDate(item.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/communities/${item.community_id}/content/${item.id}`}
                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => onDelete('content', item.id, item.title)}
                        disabled={deleting === item.id}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {deleting === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-8 bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data?.users.slice(0, 20).map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {user.full_name || 'No name'}
                      </div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.user_type === 'admin' ? 'bg-red-100 text-red-800' :
                      user.user_type === 'brand' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.user_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// Corporate Training Tab
function CorporateTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Corporate Training Management</h2>
        <p className="text-slate-600 mb-6">View all corporate accounts, enrollments, and training progress</p>
        <div className="bg-purple-50 rounded-lg p-6 max-w-2xl mx-auto text-left">
          <h3 className="font-bold text-purple-900 mb-3">Coming Soon:</h3>
          <ul className="space-y-2 text-purple-800">
            <li>• List of all corporate accounts</li>
            <li>• Employee enrollment stats</li>
            <li>• Module completion rates</li>
            <li>• Certificate issuance tracking</li>
            <li>• Revenue from training sales</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Marketplace Tab
function MarketplaceTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-orange-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Marketplace Management</h2>
        <p className="text-slate-600 mb-6">Manage modules, creator applications, and sales</p>
        <div className="bg-orange-50 rounded-lg p-6 max-w-2xl mx-auto text-left">
          <h3 className="font-bold text-orange-900 mb-3">Coming Soon:</h3>
          <ul className="space-y-2 text-orange-800">
            <li>• All published modules</li>
            <li>• Pending creator applications</li>
            <li>• Module sales dashboard</li>
            <li>• Revenue analytics</li>
            <li>• Module performance metrics</li>
            <li>• Creator approval workflow</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Wallets Tab
function WalletsTab() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="text-center py-12">
        <Wallet className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Wallets & Treasury Management</h2>
        <p className="text-slate-600 mb-6">Track all wallets, transactions, and revenue distribution</p>
        <div className="bg-green-50 rounded-lg p-6 max-w-2xl mx-auto text-left">
          <h3 className="font-bold text-green-900 mb-3">Coming Soon:</h3>
          <ul className="space-y-2 text-green-800">
            <li>• Platform treasury balance</li>
            <li>• All community wallets</li>
            <li>• All creator wallets</li>
            <li>• Transaction history</li>
            <li>• Withdrawal requests</li>
            <li>• Revenue split analytics</li>
            <li>• Payout management</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
