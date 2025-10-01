'use client'

import { useState } from 'react'

interface ContentModerationButtonsProps {
  contentId: string
  contentTitle: string
  communityId: string
  userType: string
  userRole: string | null
}

export default function ContentModerationButtons({ 
  contentId, 
  contentTitle, 
  communityId,
  userType, 
  userRole 
}: ContentModerationButtonsProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDeleteContent = async () => {
    if (!confirm(`Are you sure you want to delete this content: "${contentTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      const response = await fetch(`/api/admin?type=content&id=${contentId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      
      if (response.ok) {
        alert('Content deleted successfully')
        window.location.href = `/communities/${communityId}`
      } else {
        alert(result.error || 'Failed to delete content')
      }
    } catch (error) {
      console.error('Error deleting content:', error)
      alert('Failed to delete content')
    } finally {
      setDeleting(false)
    }
  }

  if (!(userType === 'admin' || userRole === 'founder' || userRole === 'admin')) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDeleteContent}
        disabled={deleting}
        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
      >
        {deleting ? '🗑️ Deleting...' : '🗑️ Delete Content'}
      </button>
    </div>
  )
}

