'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import CoSignAuthModal from './CoSignAuthModal'

type Props = {
  locale: CitizenSignalsLocale
  slug: string
  viewerSignedIn: boolean
  initiallyCosigned: boolean
  onChange: (next: { cosigned: boolean; count?: number }) => void
}

/**
 * Verified co-sign button.
 *
 * - Signed-in viewers: hits the existing /api/signals/[slug]/cosign route.
 * - Signed-out viewers: opens the CoSignAuthModal which offers Google +
 *   magic-link, both round-tripping through /auth/callback?next=…&promote=1
 *   so the page can auto-promote the anonymous support into a real
 *   cosign after sign-in (see app/signals/[slug]/SignalDetailClient).
 */
export default function CoSignButton({
  locale,
  slug,
  viewerSignedIn,
  initiallyCosigned,
  onChange,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const [cosigned, setCosigned] = useState(initiallyCosigned)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const toggle = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/signals/${slug}/cosign`, {
        method: cosigned ? 'DELETE' : 'POST',
      })
      if (!res.ok) {
        if (res.status === 409) {
          setCosigned(true)
          onChange({ cosigned: true })
          return
        }
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { cosign_count?: number }
      const nextCosigned = !cosigned
      setCosigned(nextCosigned)
      onChange({ cosigned: nextCosigned, count: j.cosign_count ?? undefined })
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error')
    } finally {
      setPending(false)
    }
  }

  if (!viewerSignedIn) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {t.cosign.verifiedLabel}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {t.cosign.verifiedHint}
        </p>
        <CoSignAuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          locale={locale}
          slug={slug}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          cosigned
            ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
            : 'bg-emerald-500 text-white hover:bg-emerald-400'
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-pressed={cosigned}
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        {pending
          ? t.cosign.adding
          : cosigned
            ? t.cosign.remove
            : t.cosign.verifiedLabel}
      </button>
      {error && (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
