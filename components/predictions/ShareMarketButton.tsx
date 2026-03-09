'use client'

import { useState, useCallback } from 'react'
import { Share2, ImageIcon, Download, Instagram } from 'lucide-react'

interface ShareMarketButtonProps {
  marketId: string
  marketTitle: string
  /** Show compact icon-only or full buttons */
  variant?: 'compact' | 'full'
  className?: string
}

export function ShareMarketButton({
  marketId,
  marketTitle,
  variant = 'compact',
  className = '',
}: ShareMarketButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const cardUrl = `${baseUrl}/api/og/market/${marketId}`
  const storyUrl = `${baseUrl}/api/og/market/${marketId}?format=story`
  const shareUrl = `${baseUrl}/predictions/markets/${marketId}`
  const shareText = `I predicted on "${marketTitle}" on Crowd Conscious! 🎯`

  const fetchAndShare = useCallback(
    async (url: string, filename: string, isStory: boolean) => {
      setLoading(true)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch')
        const blob = await res.blob()
        const file = new File([blob], filename, { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: shareText,
            text: shareText,
            url: shareUrl,
            files: [file],
          })
        } else {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = filename
          a.click()
          URL.revokeObjectURL(a.href)
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          if (isStory && isMobile) {
            window.open('instagram://story-camera', '_blank')
          } else if (isStory && !isMobile) {
            alert('📸 Image saved! Save and share it to your Instagram Story.')
          }
        }
      } catch {
        window.open(url, '_blank')
      } finally {
        setLoading(false)
        setOpen(false)
      }
    },
    [shareText, shareUrl]
  )

  const fetchAndDownload = useCallback(
    async (url: string, filename: string, isStory: boolean) => {
      setLoading(true)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch')
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        if (isStory && !isMobile) {
          alert('📸 Image saved! Save and share it to your Instagram Story.')
        }
      } catch {
        window.open(url, '_blank')
      } finally {
        setLoading(false)
        setOpen(false)
      }
    },
    []
  )

  const handleShareCard = useCallback(
    () => fetchAndShare(cardUrl, 'crowd-conscious-prediction.png', false),
    [cardUrl, fetchAndShare]
  )
  const handleDownloadCard = useCallback(
    () => fetchAndDownload(cardUrl, 'crowd-conscious-prediction.png', false),
    [cardUrl, fetchAndDownload]
  )
  const handleShareStory = useCallback(
    () => fetchAndShare(storyUrl, 'crowd-conscious-story.png', true),
    [storyUrl, fetchAndShare]
  )
  const handleDownloadStory = useCallback(
    () => fetchAndDownload(storyUrl, 'crowd-conscious-story.png', true),
    [storyUrl, fetchAndDownload]
  )

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 transition-colors disabled:opacity-50"
          aria-label="Share card"
        >
          <Share2 className="w-4 h-4" />
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-1 z-50 py-2 px-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl min-w-[200px]">
              <button
                onClick={handleShareCard}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm"
              >
                <ImageIcon className="w-4 h-4" />
                Share card
              </button>
              <button
                onClick={handleDownloadCard}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm"
              >
                <Download className="w-4 h-4" />
                Download card
              </button>
              <button
                onClick={handleShareStory}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm"
              >
                <Instagram className="w-4 h-4" />
                Share to Stories
              </button>
              <button
                onClick={handleDownloadStory}
                disabled={loading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm"
              >
                <Download className="w-4 h-4" />
                Download Story
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        onClick={handleShareCard}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 font-medium text-sm transition-colors disabled:opacity-60"
      >
        <ImageIcon className="w-4 h-4" />
        {loading ? 'Loading…' : 'Share card'}
      </button>
      <button
        onClick={handleDownloadCard}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        Download card
      </button>
      <button
        onClick={handleShareStory}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white font-medium text-sm transition-colors disabled:opacity-60"
      >
        <Instagram className="w-4 h-4" />
        Share to Stories
      </button>
      <button
        onClick={handleDownloadStory}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-60"
      >
        <Download className="w-4 h-4" />
        Download Story
      </button>
    </div>
  )
}
