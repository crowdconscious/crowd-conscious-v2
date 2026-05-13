'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createClientAuth } from '@/lib/auth'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

type Props = {
  open: boolean
  onClose: () => void
  locale: CitizenSignalsLocale
  slug: string
}

const GoogleIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      fill="#EA4335"
      d="M12 11v2.8h6.5c-.3 1.7-2 5-6.5 5-3.9 0-7.1-3.3-7.1-7.3S8.1 4.2 12 4.2c2.2 0 3.7.9 4.5 1.7l3.1-3C17.6 1.2 15.1 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-2H12z"
    />
  </svg>
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Auth-conversion modal shown when an anonymous viewer taps the verified
 * co-sign button. Offers Google OAuth and a magic-link email path,
 * appending `?promote=1` to the post-login redirect so the signal page
 * can auto-promote the visitor's anonymous support into a real cosign.
 */
export default function CoSignAuthModal({ open, onClose, locale, slug }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [email, setEmail] = useState('')
  const [magicState, setMagicState] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle')
  const [magicError, setMagicError] = useState<string | null>(null)
  const [oauthPending, setOauthPending] = useState(false)

  const handleClose = useCallback(() => {
    setMagicState('idle')
    setMagicError(null)
    onClose()
  }, [onClose])

  // Focus management + ESC dismissal + body scroll lock.
  useEffect(() => {
    if (!open) return
    const prevActive = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }
      if (e.key === 'Tab') {
        const root = dialogRef.current
        if (!root) return
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prevActive?.focus?.()
    }
  }, [open, handleClose])

  const promoteRedirect = () => {
    if (typeof window === 'undefined') return `/signals/${slug}?promote=1`
    const url = new URL(window.location.href)
    url.searchParams.set('promote', '1')
    return url.pathname + url.search
  }

  const onGoogle = async () => {
    setOauthPending(true)
    try {
      const supabase = createClientAuth()
      const next = promoteRedirect()
      const origin = window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) throw error
    } catch {
      setOauthPending(false)
    }
  }

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicError(null)
    if (!EMAIL_RE.test(email.trim())) {
      setMagicError(t.support.modal.invalidEmail)
      return
    }
    setMagicState('sending')
    try {
      const supabase = createClientAuth()
      const next = promoteRedirect()
      const origin = window.location.origin
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) throw error
      setMagicState('sent')
    } catch {
      setMagicState('error')
      setMagicError(t.support.modal.magicError)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-cosign-modal-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0f1419] p-6 text-left shadow-2xl"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleClose}
          aria-label={t.support.modal.dismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-[#1a2029] hover:text-slate-300"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <h2
          id="cc-cosign-modal-title"
          className="pr-8 text-xl font-bold text-white"
        >
          {t.support.modal.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t.support.modal.body}
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => void onGoogle()}
            disabled={oauthPending}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <GoogleIcon />
            {t.support.modal.google}
          </button>

          {magicState === 'sent' ? (
            <p
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
              role="status"
            >
              {t.support.modal.magicSent}
            </p>
          ) : (
            <form onSubmit={onMagicLink} className="space-y-2">
              <label className="block text-xs text-slate-400" htmlFor="cc-magic-email">
                {t.support.modal.magic}
              </label>
              <input
                id="cc-magic-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={t.support.modal.magicPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#2d3748] bg-[#11161f] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                disabled={magicState === 'sending'}
              />
              <button
                type="submit"
                disabled={magicState === 'sending'}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#2d3748] bg-[#11161f] py-2.5 text-sm font-medium text-slate-100 transition-colors hover:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {magicState === 'sending'
                  ? t.support.modal.magicSending
                  : t.support.modal.magic}
              </button>
              {magicError && (
                <p className="text-xs text-rose-300" role="alert">
                  {magicError}
                </p>
              )}
            </form>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="block w-full text-center text-xs text-slate-500 hover:text-slate-300"
          >
            {t.support.modal.keepAnon}
          </button>
        </div>
      </div>
    </div>
  )
}
