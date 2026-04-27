'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Linkedin, Share2 } from 'lucide-react'
import { trackShare, withShareUtm } from '@/lib/share-utils'

interface BlogShareButtonProps {
  /** UUID of the blog_post row — used as `other_id` in share_events. */
  postId: string
  slug: string
  title: string
  excerpt?: string | null
  locale: 'es' | 'en'
  /** Analytics surface: 'blog_post_top' | 'blog_post_bottom' | etc. */
  surface?: string
  /** Compact icon-only trigger for tight headers; default is full pill. */
  compact?: boolean
}

const COPY = {
  es: {
    trigger: 'Compartir',
    triggerCompact: 'Compartir',
    whatsapp: 'WhatsApp',
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    native: 'Más opciones…',
    copy: 'Copiar enlace',
    copied: '¡Copiado!',
    aria: 'Compartir este artículo',
  },
  en: {
    trigger: 'Share',
    triggerCompact: 'Share',
    whatsapp: 'WhatsApp',
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    native: 'More options…',
    copy: 'Copy link',
    copied: 'Copied!',
    aria: 'Share this article',
  },
} as const

function getOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
}

/**
 * Public-facing share menu for blog posts.
 *
 * Channels: WhatsApp, X, LinkedIn, Facebook, native Web Share (mobile),
 * copy-link. Analytics piggy-backs on the existing `share_events` table
 * via `trackShare({ type: 'other', otherType: 'blog_post', otherId })`,
 * so blog shares aggregate cleanly alongside market/location shares
 * without a new endpoint.
 *
 * The dropdown is portal-free (absolute under the trigger). On mobile,
 * tapping the "More options" item invokes navigator.share so iOS/Android
 * users get the native share sheet (Stories, AirDrop, Messages, etc.).
 */
export function BlogShareButton({
  postId,
  slug,
  title,
  excerpt,
  locale,
  surface = 'blog_post',
  compact = false,
}: BlogShareButtonProps) {
  const t = COPY[locale]
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const baseUrl = `${getOrigin()}/blog/${slug}`
  const target = { type: 'other' as const, otherType: 'blog_post', otherId: postId }

  const tagline =
    locale === 'es'
      ? excerpt?.trim() || 'Léelo en Crowd Conscious'
      : excerpt?.trim() || 'Read it on Crowd Conscious'

  const openInNewTab = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const handleWhatsApp = () => {
    const url = withShareUtm(baseUrl, 'whatsapp')
    const text = `${title}\n\n${url}`
    openInNewTab(`https://wa.me/?text=${encodeURIComponent(text)}`)
    trackShare(target, 'whatsapp', surface)
    setOpen(false)
  }

  const handleX = () => {
    const url = withShareUtm(baseUrl, 'twitter')
    const text = encodeURIComponent(title)
    const u = encodeURIComponent(url)
    openInNewTab(`https://twitter.com/intent/tweet?text=${text}&url=${u}`)
    trackShare(target, 'twitter', surface)
    setOpen(false)
  }

  const handleLinkedIn = () => {
    const url = withShareUtm(baseUrl, 'other')
    openInNewTab(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)
    trackShare(target, 'other', surface)
    setOpen(false)
  }

  const handleFacebook = () => {
    const url = withShareUtm(baseUrl, 'facebook')
    openInNewTab(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
    trackShare(target, 'facebook', surface)
    setOpen(false)
  }

  const handleCopy = async () => {
    const url = withShareUtm(baseUrl, 'clipboard')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      trackShare(target, 'clipboard', surface)
    } catch {
      window.prompt(t.copy, url)
    }
  }

  const handleNative = async () => {
    if (!hasNativeShare) return
    const url = withShareUtm(baseUrl, 'native_share')
    try {
      await navigator.share({ title, text: tagline, url })
      trackShare(target, 'native_share', surface)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('[BlogShareButton] native share failed:', err)
      }
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.aria}
        className={
          compact
            ? 'inline-flex items-center justify-center h-9 w-9 rounded-full text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors'
            : 'inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 border border-emerald-500/20 text-sm font-medium transition-colors'
        }
      >
        <Share2 className="w-4 h-4" />
        {!compact && t.trigger}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.aria}
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur z-50 py-1.5"
        >
          <MenuItem onClick={handleWhatsApp} icon={<span className="text-base">💬</span>} label={t.whatsapp} />
          <MenuItem onClick={handleX} icon={<span className="font-bold">𝕏</span>} label={t.x} />
          <MenuItem
            onClick={handleLinkedIn}
            icon={<Linkedin className="w-4 h-4" />}
            label={t.linkedin}
          />
          <MenuItem onClick={handleFacebook} icon={<span className="font-bold">f</span>} label={t.facebook} />
          <div className="my-1 border-t border-slate-700/80" />
          <MenuItem
            onClick={handleCopy}
            icon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            label={copied ? t.copied : t.copy}
            accent={copied}
          />
          {hasNativeShare && (
            <>
              <div className="my-1 border-t border-slate-700/80" />
              <MenuItem
                onClick={handleNative}
                icon={<Share2 className="w-4 h-4" />}
                label={t.native}
                accent
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick,
  icon,
  label,
  accent = false,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full px-3.5 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
        accent
          ? 'text-emerald-300 hover:bg-emerald-500/10'
          : 'text-slate-200 hover:bg-slate-800'
      }`}
    >
      <span className="inline-flex items-center justify-center w-5 h-5">{icon}</span>
      {label}
    </button>
  )
}
