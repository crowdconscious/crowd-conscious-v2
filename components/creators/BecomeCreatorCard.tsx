'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'
import { inputBaseClass } from '@/components/ui/input'
import { getCreatorCopy, isValidHandle, normalizeHandle, type CreatorLocale } from '@/lib/i18n/creator'

interface BecomeCreatorCardProps {
  locale: CreatorLocale
  /** When false, hides the "learn about the program" link (e.g. when already on /creators). */
  showLearnMore?: boolean
  className?: string
}

/**
 * Self-serve "Become a creator" upgrade for an already-signed-up, logged-in
 * user. Collects a public handle (same validation UX as /creators/signup) and
 * calls POST /api/creator/upgrade, which flips the current session's account to
 * `influencer` + claims the handle. On success, redirects to /creator.
 *
 * Render this ONLY for logged-in users who are not already creators and not
 * admin/corporate accounts — the endpoint also enforces those guards.
 */
export default function BecomeCreatorCard({
  locale,
  showLearnMore = true,
  className = '',
}: BecomeCreatorCardProps) {
  const t = getCreatorCopy(locale)
  const router = useRouter()

  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const normalized = normalizeHandle(handle)
    if (!isValidHandle(normalized)) {
      setError(t.handleInvalid)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/creator/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalized }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        if (json.error === 'handle_taken') setError(t.handleTaken)
        else if (json.error === 'invalid_handle') setError(t.handleInvalid)
        else if (json.error === 'forbidden_role') setError(t.upgradeForbidden)
        else setError(t.upgradeError)
        return
      }

      router.push('/creator')
      router.refresh()
    } catch {
      setError(t.upgradeError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
          <Sparkles className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold text-white">{t.upgradeTitle}</h3>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        {t.upgradeBody}{' '}
        {showLearnMore && (
          <Link
            href="/creators"
            className="font-medium text-emerald-400 underline-offset-2 hover:text-emerald-300 hover:underline"
          >
            {t.upgradeLearnMore}
          </Link>
        )}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="creator-handle" className="mb-2 block text-sm font-medium text-gray-300">
            {t.signupHandle}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">@</span>
            <input
              id="creator-handle"
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              required
              minLength={3}
              maxLength={30}
              className={inputBaseClass}
              placeholder="tu_handle"
              autoComplete="off"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">{t.signupHandleHint}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
        >
          {loading ? t.upgradeSubmitting : t.upgradeCta}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
