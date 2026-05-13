'use client'

import { useState } from 'react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

type Props = {
  locale: CitizenSignalsLocale
  slug: string
  viewerSignedIn: boolean
  initiallyCosigned: boolean
  onChange: (next: { cosigned: boolean; count?: number }) => void
}

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

  if (!viewerSignedIn) {
    return (
      <a
        href={`/login?next=/signals/${slug}`}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
      >
        {t.cosign.requireAuth}
      </a>
    )
  }

  const toggle = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/signals/${slug}/cosign`, {
        method: cosigned ? 'DELETE' : 'POST',
      })
      if (!res.ok) {
        if (res.status === 409) {
          // Already co-signed server-side; reconcile state.
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

  return (
    <>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        className={`mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          cosigned
            ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
            : 'bg-emerald-500 text-white hover:bg-emerald-400'
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-pressed={cosigned}
      >
        {pending
          ? t.cosign.adding
          : cosigned
            ? t.cosign.remove
            : t.cosign.add}
      </button>
      {error && (
        <p className="mt-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
