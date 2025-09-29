'use client'

import { useState, useEffect } from 'react'
import { generateShareableUrl } from '../../lib/media'

interface ShareButtonProps {
  contentId: string
  contentType: 'poll' | 'event' | 'need' | 'challenge'
  title: string
  description?: string
  className?: string
}

export default function ShareButton({ 
  contentId, 
  contentType, 
  title, 
  description,
  className = '' 
}: ShareButtonProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  // Set share URL only on client side to avoid server/client mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/communities/${contentId}`)
    }
  }, [contentId])

  const handleCopyLink = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleTwitterShare = () => {
    const text = `Check out this ${contentType}: ${title}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=550,height=420')
  }

  const handleWhatsAppShare = () => {
    const text = `Check out this ${contentType}: ${title} ${shareUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleEmailShare = () => {
    const subject = `Check out this ${contentType}: ${title}`
    const body = `I thought you might be interested in this ${contentType}:\n\n${title}\n\n${description || ''}\n\n${shareUrl}`
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex items-center gap-1 px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-700 rounded-lg transition-colors"
        title="Share this content"
      >
        <span>🔗</span>
        Share
      </button>

      {showOptions && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowOptions(false)}
          />
          
          {/* Share Options Menu */}
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 z-50 min-w-[200px]">
            <div className="text-xs font-medium text-neutral-700 mb-3">Share this {contentType}</div>
            
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <span className="text-lg">🔗</span>
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
              
              <button
                onClick={handleTwitterShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <span className="text-lg">🐦</span>
                <span>Share on Twitter</span>
              </button>
              
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <span className="text-lg">💬</span>
                <span>Share on WhatsApp</span>
              </button>
              
              <button
                onClick={handleEmailShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <span className="text-lg">✉️</span>
                <span>Share via Email</span>
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <div className="text-xs text-neutral-500">
                Anyone with this link can view this content, even without an account.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
