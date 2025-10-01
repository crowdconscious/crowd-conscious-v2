'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AdminModerationButtonsProps {
  communityId: string
  communityName: string
  userType: string
  userRole: string | null
}

export default function AdminModerationButtons({ 
  communityId, 
  communityName, 
  userType, 
  userRole 
}: AdminModerationButtonsProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDeleteCommunity = async () => {
    if (!confirm(`Are you sure you want to delete the community "${communityName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/admin?type=community&id=${communityId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (response.ok) {
        alert('Community deleted successfully')
        window.location.href = '/communities'
      } else {
        alert(result.error || 'Failed to delete community')
      }
    } catch (error) {
      console.error('Error deleting community:', error)
      alert('Failed to delete community')
    } finally {
      setDeleting(false)
    }
  }

  if (!(userType === 'admin' || userRole === 'founder' || userRole === 'admin')) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {userType === 'admin' && (
        <button
          onClick={handleDeleteCommunity}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
        >
          {deleting ? '🗑️ Deleting...' : '🗑️ Delete Community'}
        </button>
      )}
      <Link
        href={`/communities/${communityId}/settings`}
        className="bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
      >
        ⚙️ Settings
      </Link>
    </div>
  )
}

