'use client'

import { useState } from 'react'
import { AnimatedButton } from '@/components/ui/UIComponents'
import { addToast } from './NotificationSystem'

interface ShareData {
  title: string
  description: string
  url: string
  image?: string
  type: 'community' | 'content' | 'event'
}

// QR Code Generator (simplified - in production use a proper QR library)
function generateQRCode(data: string): string {
  // This is a placeholder - use a real QR code library like 'qrcode' in production
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`
}

export function ShareButton({ shareData }: { shareData: ShareData }) {
  const [isOpen, setIsOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const shareUrl = `${window.location.origin}${shareData.url}`
  const qrCodeUrl = generateQRCode(shareUrl)

  const socialPlatforms = [
    {
      name: 'Twitter',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.title)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-400 hover:bg-blue-500'
    },
    {
      name: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-700 hover:bg-blue-800'
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareData.title} - ${shareUrl}`)}`,
      color: 'bg-green-500 hover:bg-green-600'
    }
  ]

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      addToast({
        type: 'success',
        title: 'Link Copied!',
        message: 'Share link has been copied to your clipboard'
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      addToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Could not copy link to clipboard'
      })
    }
  }

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareUrl
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <span>📤</span>
        <span className="text-sm font-medium">Share</span>
      </button>

      {isOpen && (
        <>
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Share this {shareData.type}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-slate-900 text-sm mb-1">{shareData.title}</h4>
              <p className="text-slate-600 text-xs line-clamp-2">{shareData.description}</p>
              {shareData.image && (
                <img
                  src={shareData.image}
                  alt="Preview"
                  className="w-full h-20 object-cover rounded mt-2"
                />
              )}
            </div>

            {/* Social Media Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {socialPlatforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-3 py-2 text-white rounded-lg transition-colors ${platform.color}`}
                >
                  <span>{platform.icon}</span>
                  <span className="text-sm font-medium">{platform.name}</span>
                </a>
              ))}
            </div>

            {/* Copy Link */}
            <div className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
                <AnimatedButton
                  onClick={copyToClipboard}
                  variant="secondary"
                  size="sm"
                >
                  Copy
                </AnimatedButton>
              </div>

              {/* Native Share (mobile) */}
              {typeof navigator.share === 'function' && (
                <AnimatedButton
                  onClick={shareNative}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  📱 Share via Device
                </AnimatedButton>
              )}
            </div>

            {/* QR Code */}
            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={() => setShowQR(!showQR)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm"
              >
                <span>📱</span>
                <span>{showQR ? 'Hide' : 'Show'} QR Code</span>
              </button>

              {showQR && (
                <div className="mt-3 text-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-32 h-32 mx-auto border border-slate-200 rounded-lg"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Scan with your phone to share
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  )
}

// Generate Open Graph meta tags for better social sharing
export function generateOGTags(data: ShareData) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  
  return {
    'og:title': data.title,
    'og:description': data.description,
    'og:url': `${baseUrl}${data.url}`,
    'og:type': data.type === 'event' ? 'event' : 'website',
    'og:image': data.image || `${baseUrl}/api/og?title=${encodeURIComponent(data.title)}`,
    'og:site_name': 'Crowd Conscious',
    'twitter:card': 'summary_large_image',
    'twitter:title': data.title,
    'twitter:description': data.description,
    'twitter:image': data.image || `${baseUrl}/api/og?title=${encodeURIComponent(data.title)}`
  }
}

// Invite Friends Component
export function InviteFriends({ communityId, communityName }: { communityId: string, communityName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [emails, setEmails] = useState('')
  const [message, setMessage] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const defaultMessage = `Hey! I found this amazing community "${communityName}" on Crowd Conscious where we can make real impact together. Would you like to join me?`

  const sendInvites = async () => {
    setIsInviting(true)
    
    const emailList = emails.split(',').map(email => email.trim()).filter(email => email)
    
    try {
      const response = await fetch('/api/invites/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emailList,
          communityId,
          communityName,
          message: message || defaultMessage
        })
      })

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Invites Sent!',
          message: `Invitations sent to ${emailList.length} people`
        })
        setEmails('')
        setMessage('')
        setIsOpen(false)
      } else {
        throw new Error('Failed to send invites')
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Invite Failed',
        message: 'Could not send invitations. Please try again.'
      })
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="relative">
      <AnimatedButton
        onClick={() => setIsOpen(true)}
        variant="secondary"
        size="sm"
      >
        👥 Invite Friends
      </AnimatedButton>

      {isOpen && (
        <>
          <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Invite Friends to {communityName}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Addresses (comma separated)
                </label>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="friend1@email.com, friend2@email.com..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Personal Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={defaultMessage}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <AnimatedButton
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  onClick={sendInvites}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={isInviting}
                  disabled={!emails.trim()}
                >
                  Send Invites
                </AnimatedButton>
              </div>
            </div>
          </div>

          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  )
}
