'use client'

import { useEffect, useState } from 'react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

type CommentRow = {
  id: string
  body: string
  created_at: string
  author: { full_name: string | null; avatar_url: string | null } | null
}

export default function Comments({
  locale,
  slug,
  viewerSignedIn,
}: {
  locale: CitizenSignalsLocale
  slug: string
  viewerSignedIn: boolean
}) {
  const t = getCitizenSignalsCopy(locale)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/signals/${slug}/comments`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = (await res.json()) as { comments: CommentRow[] }
        if (!cancelled) setComments(j.comments ?? [])
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error).message ?? 'Error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const post = async () => {
    if (draft.trim().length < 2) return
    setPosting(true)
    setError(null)
    try {
      const res = await fetch(`/api/signals/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as {
        id: string
        body: string
        created_at: string
      }
      setComments((prev) => [
        ...prev,
        { id: j.id, body: j.body, created_at: j.created_at, author: null },
      ])
      setDraft('')
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Error')
    } finally {
      setPosting(false)
    }
  }

  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">{t.detail.commentsTitle}</h2>

      {viewerSignedIn ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t.detail.addCommentPlaceholder}
            className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {error && (
              <p className="text-xs text-rose-300" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void post()}
              disabled={posting || draft.trim().length < 2}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting
                ? locale === 'es'
                  ? 'Publicando…'
                  : 'Posting…'
                : t.detail.addCommentSubmit}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-[#2d3748] bg-[#11161f] p-3 text-sm text-slate-400">
          {locale === 'es'
            ? 'Inicia sesión para comentar.'
            : 'Sign in to comment.'}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">
          {locale === 'es' ? 'Cargando…' : 'Loading…'}
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {locale === 'es'
            ? 'Aún no hay comentarios.'
            : 'No comments yet.'}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-[#2d3748] bg-[#11161f] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {c.author?.full_name ?? (locale === 'es' ? 'Vecino' : 'Neighbour')}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(c.created_at).toLocaleString(dateLocale)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-300">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
