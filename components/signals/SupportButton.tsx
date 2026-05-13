'use client'

import { useEffect, useState } from 'react'
import { Check, Heart } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import { getDeviceFingerprint } from '@/lib/signals/fingerprint'

type SupportApiResponse = {
  ok?: boolean
  alreadySupported?: boolean
  anonymous_support_count?: number | null
  error?: string
}

type Props = {
  locale: CitizenSignalsLocale
  slug: string
  /** Render is suppressed when the viewer is signed in: they have the verified cosign button instead. */
  viewerSignedIn: boolean
  initialCount: number
  onChange: (next: { supported: boolean; count?: number }) => void
}

const STORAGE_KEY_PREFIX = 'cc_anon_supported:'

/**
 * Friction-light "Apoyo" button rendered on the signal detail page.
 *
 * - Anonymous (signed-out) viewers only. Signed-in viewers are routed
 *   through CoSignButton instead — the verified cosign flow already
 *   captures their intent.
 * - Computes a stable-ish device fingerprint and POSTs it. Dedupe is
 *   server-side (UNIQUE constraint); we also remember locally per-slug
 *   so a refresh shows the "ya apoyaste" state without an extra round
 *   trip.
 */
export default function SupportButton({
  locale,
  slug,
  viewerSignedIn,
  initialCount,
  onChange,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [supported, setSupported] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thanked, setThanked] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const flag = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`)
      if (flag === '1') setSupported(true)
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, [slug])

  if (viewerSignedIn) return null

  const persistLocal = () => {
    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, '1')
    } catch {
      // ignore
    }
  }

  const submit = async () => {
    if (supported || pending) return
    setPending(true)
    setError(null)
    try {
      const fp = await getDeviceFingerprint()
      const res = await fetch(`/api/signals/${slug}/anonymous-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceFingerprint: fp }),
      })
      const json = (await res.json().catch(() => ({}))) as SupportApiResponse
      if (!res.ok || !json.ok) {
        const msg =
          typeof json.error === 'string' && json.error
            ? json.error
            : t.support.errorGeneric
        throw new Error(msg)
      }
      setSupported(true)
      setThanked(!json.alreadySupported)
      persistLocal()
      onChange({
        supported: true,
        count:
          typeof json.anonymous_support_count === 'number'
            ? json.anonymous_support_count
            : undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t.support.errorGeneric)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={pending || supported}
        aria-pressed={supported}
        className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          supported
            ? 'border border-emerald-300/40 bg-emerald-400/10 text-emerald-200'
            : 'border border-emerald-300/40 bg-transparent text-emerald-200 hover:bg-emerald-400/10'
        } disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {supported ? (
          <>
            <Check className="h-4 w-4" aria-hidden />
            {t.support.labelGiven}
          </>
        ) : (
          <>
            <Heart className="h-4 w-4" aria-hidden />
            {pending ? t.support.sending : t.support.label}
          </>
        )}
      </button>
      {thanked && (
        <p
          className="mt-2 text-center text-xs text-emerald-300"
          role="status"
          aria-live="polite"
        >
          {t.support.thanksToast}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        {t.support.helper}
      </p>
      <span className="sr-only" aria-live="polite">
        {t.support.countLabel(initialCount)}
      </span>
    </>
  )
}
