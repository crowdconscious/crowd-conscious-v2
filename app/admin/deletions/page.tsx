'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DeletionRequest {
  id: string
  request_type: 'community' | 'user' | 'content'
  target_id: string
  target_name: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  requester: {
    full_name: string | null
    email: string
  } | null
  reviewer: {
    full_name: string | null
    email: string
  } | null
}

export default function DeletionManagementPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchDeletionRequests()
  }, [])

  const fetchDeletionRequests = async () => {
    try {
      const response = await fetch('/api/admin/deletion-requests')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard?error=unauthorized')
          return
        }
        throw new Error(result.error || 'Failed to fetch deletion requests')
      }

      setRequests(result.data || [])
    } catch (error) {
      console.error('Error fetching deletion requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    setProcessingId(requestId)
    try {
      const response = await fetch(`/api/admin/deletion-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: adminNotes })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process request')
      }

      // Refresh the list
      await fetchDeletionRequests()
      
      alert(`Deletion request ${status} successfully`)
    } catch (error: any) {
      console.error('Error processing deletion request:', error)
      alert('Error: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    if (filter === 'pending') return request.status === 'pending'
    if (filter === 'processed') return ['approved', 'rejected', 'completed'].includes(request.status)
    return request.request_type === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'community': return '🏘️'
      case 'user': return '👤'
      case 'content': return '📄'
      default: return '❓'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading deletion requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">🗑️ Deletion Management</h1>
          <p className="text-slate-600">Review and manage deletion requests from community founders and users.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Requests' },
              { key: 'pending', label: 'Pending' },
              { key: 'processed', label: 'Processed' },
              { key: 'community', label: 'Communities' },
              { key: 'user', label: 'Users' },
              { key: 'content', label: 'Content' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-teal-100 text-teal-700 border border-teal-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{requests.length}</div>
            <div className="text-sm text-slate-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <div className="text-sm text-slate-600">Pending Review</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'approved' || r.status === 'completed').length}
            </div>
            <div className="text-sm text-slate-600">Approved</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="text-2xl font-bold text-red-600">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
            <div className="text-sm text-slate-600">Rejected</div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No deletion requests</h3>
              <p className="text-slate-600">
                {filter === 'all' 
                  ? 'No deletion requests have been submitted yet.'
                  : `No ${filter} deletion requests found.`
                }
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getTypeIcon(request.request_type)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        Delete {request.request_type}: {request.target_name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Requested by {request.requester?.full_name || request.requester?.email || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </div>
                </div>

                {request.reason && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-900 mb-1">Reason:</h4>
                    <p className="text-sm text-slate-600">{request.reason}</p>
                  </div>
                )}

                {request.admin_notes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Admin Notes:</h4>
                    <p className="text-sm text-blue-700">{request.admin_notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    <div>Created: {new Date(request.created_at).toLocaleString()}</div>
                    {request.reviewed_at && (
                      <div>Reviewed: {new Date(request.reviewed_at).toLocaleString()}</div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const notes = prompt('Admin notes (optional):')
                          if (notes !== null) {
                            handleRequestAction(request.id, 'rejected', notes)
                          }
                        }}
                        disabled={processingId === request.id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {processingId === request.id ? 'Processing...' : 'Reject'}
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Admin notes (optional):')
                          if (notes !== null) {
                            if (confirm(`Are you sure you want to approve the deletion of "${request.target_name}"? This action cannot be undone.`)) {
                              handleRequestAction(request.id, 'approved', notes)
                            }
                          }
                        }}
                        disabled={processingId === request.id}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        {processingId === request.id ? 'Processing...' : 'Approve & Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
