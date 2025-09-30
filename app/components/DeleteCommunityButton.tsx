'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteCommunityButtonProps {
  communityId: string
  communityName: string
  userRole: string | null
  className?: string
}

export default function DeleteCommunityButton({ 
  communityId, 
  communityName, 
  userRole, 
  className = '' 
}: DeleteCommunityButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const router = useRouter()

  // Only founders can request community deletion
  if (userRole !== 'founder') {
    return null
  }

  const handleDeleteRequest = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the deletion request.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/deletion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'community',
          target_id: communityId,
          target_name: communityName,
          reason: reason.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit deletion request')
      }

      alert('Deletion request submitted successfully! An admin will review your request.')
      setShowConfirm(false)
      setReason('')
      
      // Optionally redirect to a confirmation page or refresh
      router.refresh()

    } catch (error: any) {
      console.error('Error submitting deletion request:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Request Community Deletion</h3>
            <p className="text-slate-600">
              This will submit a request to delete "<strong>{communityName}</strong>". 
              An admin will review your request before any action is taken.
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
              Reason for deletion (required):
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              rows={4}
              placeholder="Please explain why you want to delete this community..."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirm(false)
                setReason('')
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteRequest}
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium ${className}`}
    >
      🗑️ Request Deletion
    </button>
  )
}
