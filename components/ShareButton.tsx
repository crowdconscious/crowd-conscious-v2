'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedButton } from '@/components/ui/UIComponents'

interface ShareButtonProps {
  contentId: string
  contentType: 'poll' | 'event' | 'need' | 'challenge' | 'community'
  title: string
  description?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function ShareButton({
  contentId,
  contentType,
  title,
  description,
  variant = 'secondary',
  size = 'sm',
  className = ''
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const createShareLink = async (): Promise<string> => {
    try {
      // For communities, use direct link
      if (contentType === 'community') {
        return `${window.location.origin}/communities/${contentId}`
      }

      // For now, use direct content links until share_links table is set up
      // This will work immediately without database dependencies
      return `${window.location.origin}/communities/${contentId}/content/${contentId}`
    } catch (error) {
      console.error('Share link creation error:', error)
      // Fallback to current page URL
      return window.location.href
    }
  }

  const copyToClipboard = async () => {
    setIsSharing(true)
    try {
      const shareUrl = await createShareLink()
      
      // Check if clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      // Show success feedback
      setShowShareMenu(false)
      
      // Better user feedback - you can replace this with toast notification later
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      notification.textContent = 'Share link copied to clipboard!'
      document.body.appendChild(notification)
      
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 3000)
      
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      
      // Show error feedback
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      notification.textContent = 'Failed to copy link. Please try again.'
      document.body.appendChild(notification)
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 3000)
    } finally {
      setIsSharing(false)
    }
  }

  const shareToSocial = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp') => {
    setIsSharing(true)
    try {
      const shareUrl = await createShareLink()
      const shareText = `Check out this ${contentType}: ${title}`
      
      let socialUrl = ''
      
      switch (platform) {
        case 'twitter':
          socialUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
          break
        case 'facebook':
          socialUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
          break
        case 'linkedin':
          socialUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
          break
        case 'whatsapp':
          socialUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
          break
      }
      
      window.open(socialUrl, '_blank', 'width=600,height=400')
      setShowShareMenu(false)
    } catch (error) {
      console.error('Error sharing to social:', error)
      alert('Failed to share')
    } finally {
      setIsSharing(false)
    }
  }

  const shareNative = async () => {
    if (!navigator.share) {
      // Fallback to copy to clipboard
      return copyToClipboard()
    }

    setIsSharing(true)
    try {
      const shareUrl = await createShareLink()
      
      await navigator.share({
        title: title,
        text: description || `Check out this ${contentType}`,
        url: shareUrl,
      })
      
      setShowShareMenu(false)
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error)
        // Fallback to copy to clipboard
        await copyToClipboard()
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <AnimatedButton
        onClick={() => {
          if (typeof navigator.share === 'function' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            shareNative()
          } else {
            setShowShareMenu(!showShareMenu)
          }
        }}
        variant={variant}
        size={size}
        loading={isSharing}
        className="flex items-center gap-2"
      >
        <span>📤</span>
        <span>Share</span>
      </AnimatedButton>

      {/* Share Menu Dropdown */}
      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowShareMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <h3 className="font-medium text-slate-900 text-sm">Share this {contentType}</h3>
              <p className="text-xs text-slate-500 mt-1 truncate">{title}</p>
            </div>
            
            <div className="p-2">
              {/* Copy Link */}
              <button
                onClick={copyToClipboard}
                disabled={isSharing}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 rounded-lg text-sm transition-colors"
              >
                <span className="text-lg">🔗</span>
                <span>Copy Link</span>
              </button>

              {/* Social Media */}
              <button
                onClick={() => shareToSocial('twitter')}
                disabled={isSharing}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 rounded-lg text-sm transition-colors"
              >
                <span className="text-lg">🐦</span>
                <span>Share on Twitter</span>
              </button>

              <button
                onClick={() => shareToSocial('facebook')}
                disabled={isSharing}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 rounded-lg text-sm transition-colors"
              >
                <span className="text-lg">📘</span>
                <span>Share on Facebook</span>
              </button>

              <button
                onClick={() => shareToSocial('whatsapp')}
                disabled={isSharing}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 rounded-lg text-sm transition-colors"
              >
                <span className="text-lg">💬</span>
                <span>Share on WhatsApp</span>
              </button>

              <button
                onClick={() => shareToSocial('linkedin')}
                disabled={isSharing}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 rounded-lg text-sm transition-colors"
              >
                <span className="text-lg">💼</span>
                <span>Share on LinkedIn</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
