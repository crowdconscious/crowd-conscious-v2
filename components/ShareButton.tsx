'use client'

import { useState, useRef, useEffect } from 'react'
import {
  shareToTwitter,
  shareToWhatsApp,
  shareToFacebook,
  copyMarketLink,
  downloadCard,
  shareNative,
  trackShare,
} from '@/lib/share-utils'
import { useLocale } from '@/lib/i18n/useLocale'

interface ShareButtonProps {
  marketId: string
  title: string
  sponsorName?: string | null
  compact?: boolean
  /** Analytics surface ('market_card', 'market_detail', 'trades', ...). */
  surface?: string
}

export default function ShareButton({
  marketId,
  title,
  sponsorName,
  compact = false,
  surface = 'share_menu',
}: ShareButtonProps) {
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const target = { type: 'market' as const, marketId }

  const handleCopy = () => {
    copyMarketLink(marketId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    trackShare(target, 'clipboard', surface)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={
          compact
            ? 'text-slate-400 hover:text-emerald-400 transition-colors p-1'
            : 'flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-sm font-medium'
        }
      >
        <svg
          width={compact ? 16 : 18}
          height={compact ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {!compact && 'Share'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-2">
          <button
            onClick={() => {
              shareToTwitter(marketId, title)
              trackShare(target, 'twitter', surface)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
          >
            𝕏 Share on X
          </button>
          <button
            onClick={() => {
              shareToWhatsApp(marketId, title, sponsorName)
              trackShare(target, 'whatsapp', surface)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
          >
            💬 WhatsApp
          </button>
          <button
            onClick={() => {
              shareToFacebook(marketId)
              trackShare(target, 'facebook', surface)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
          >
            📘 Facebook
          </button>
          <div className="border-t border-slate-700 my-1" />
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
          >
            {copied ? '✓ Copied!' : '🔗 Copy link'}
          </button>
          <button
            onClick={() => {
              downloadCard(marketId, 'standard', locale)
              trackShare(target, 'story_download', surface)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
          >
            📥 Download card
          </button>
          <button
            onClick={() => {
              downloadCard(marketId, 'story', locale)
              trackShare(target, 'story_download', surface)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
          >
            📱 Download Story
          </button>
          <div className="border-t border-slate-700 my-1" />
          <button
            onClick={() => {
              shareNative(marketId, title, 'standard', locale, sponsorName)
              trackShare(target, 'native_share', surface)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-emerald-400 hover:bg-slate-700 flex items-center gap-3 font-medium"
          >
            📤 Share with image...
          </button>
        </div>
      )}
    </div>
  )
}
