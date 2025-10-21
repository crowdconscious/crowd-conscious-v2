'use client'

import { useState, useEffect } from 'react'

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
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate public share URL on mount
  useEffect(() => {
    generateShareUrl()
  }, [contentId])

  const generateShareUrl = async () => {
    if (typeof window === 'undefined') return
    
    try {
      setIsGenerating(true)
      
      // Use the public share URL format
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const publicShareUrl = `${baseUrl}/share/content/${contentId}`
      
      setShareUrl(publicShareUrl)

      // Track the share generation (optional)
      fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentId, 
          contentType 
        }),
      }).catch(err => console.error('Failed to track share:', err))
      
    } catch (error) {
      console.error('Failed to generate share URL:', error)
      // Fallback to direct URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setShareUrl(`${baseUrl}/share/content/${contentId}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const trackShare = async (platform: string) => {
    try {
      // Track which platform the user shared to
      await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentId, 
          contentType,
          platform 
        }),
      })
    } catch (error) {
      console.error('Failed to track share:', error)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      trackShare('copy')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleTwitterShare = () => {
    if (!shareUrl) return
    
    const text = `Check out this ${contentType}: ${title}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=550,height=420')
    trackShare('twitter')
    setShowOptions(false)
  }

  const handleWhatsAppShare = () => {
    if (!shareUrl) return
    
    const text = `Check out this ${contentType}: ${title} ${shareUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    trackShare('whatsapp')
    setShowOptions(false)
  }

  const handleEmailShare = () => {
    if (!shareUrl) return
    
    const subject = `Check out this ${contentType}: ${title}`
    const body = `I thought you might be interested in this ${contentType}:\n\n${title}\n\n${description || ''}\n\nView and participate here:\n${shareUrl}`
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
    trackShare('email')
    setShowOptions(false)
  }

  const handleFacebookShare = () => {
    if (!shareUrl) return
    
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=550,height=420')
    trackShare('facebook')
    setShowOptions(false)
  }

  const handleLinkedInShare = () => {
    if (!shareUrl) return
    
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=550,height=420')
    trackShare('linkedin')
    setShowOptions(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={isGenerating || !shareUrl}
        className="flex items-center gap-1 px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Share this content"
      >
        <span>🔗</span>
        {isGenerating ? 'Loading...' : 'Share'}
      </button>

      {showOptions && shareUrl && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowOptions(false)}
          />
          
          {/* Share Options Menu */}
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 p-3 z-50 min-w-[240px]">
            <div className="text-xs font-medium text-neutral-700 mb-3">
              📣 Share this {contentType}
            </div>
            
            <div className="space-y-1">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors"
              >
                <span className="text-lg">{copied ? '✅' : '🔗'}</span>
                <span className="font-medium">{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
              
              <button
                onClick={handleTwitterShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
              >
                <span className="text-lg">🐦</span>
                <span>Share on Twitter</span>
              </button>

              <button
                onClick={handleFacebookShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
              >
                <span className="text-lg">📘</span>
                <span>Share on Facebook</span>
              </button>

              <button
                onClick={handleLinkedInShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
              >
                <span className="text-lg">💼</span>
                <span>Share on LinkedIn</span>
              </button>
              
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors"
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
              <div className="text-xs text-neutral-500 leading-relaxed">
                ✨ Anyone can view and participate - even without an account!
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
