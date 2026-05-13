'use client'

import { useEffect, useMemo, useState } from 'react'
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

type Props = {
  locale: CitizenSignalsLocale
  slug: string
  viewerSignedIn: boolean
}

const COLLAPSED_VISIBLE = 5

/**
 * Public comments thread for a Citizen Signal.
 *
 * Hits /api/signals/[slug]/comments for the list + write surface.
 * Comments older than the most recent five are hidden behind a
 * "Ver más comentarios" toggle so a thread that grows to dozens of
 * replies doesn't push the engagement widgets off-screen on mobile.
 *
 * Note: the comment textarea sets background/color via inline styles
 * because globals.css force-styles input/textarea/select with
 * `!important`. The wrapping layout adds `data-theme="dark"` so the
 * design tokens already resolve to the dark palette, but inline styles
 * make the intent explicit and protect the dark theme even if the
 * cascade ever changes.
 */
export default function CommentsThread({ locale, slug, viewerSignedIn }: Props) {
  const t = getCitizenSignalsCopy(locale)
  const dateLocale = locale === 'es' ? 'es-MX' : 'en-US'

  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

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

  // The most recent COLLAPSED_VISIBLE replies show by default; older
  // ones unfold via the toggle. Keeping the slice memoized avoids
  // recomputing it on every keystroke while typing a reply.
  const visible = useMemo(() => {
    if (expanded || comments.length <= COLLAPSED_VISIBLE) return comments
    return comments.slice(comments.length - COLLAPSED_VISIBLE)
  }, [comments, expanded])

  const hiddenCount = comments.length - visible.length

  return (
    <div>
      <h2 className="text-lg font-semibold text-white">
        {t.detail.commentsTitle}
        {comments.length > 0 && (
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({comments.length})
          </span>
        )}
      </h2>

      {viewerSignedIn ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t.detail.addCommentPlaceholder}
            className="w-full rounded-lg border border-[#2d3748] px-3 py-2 text-sm"
            style={{
              backgroundColor: '#0f1419',
              color: '#f1f5f9',
              borderColor: '#2d3748',
            }}
            aria-label={t.detail.addCommentPlaceholder}
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
          <a
            href={`/login?next=/signals/${slug}`}
            className="text-emerald-300 underline-offset-2 hover:underline"
          >
            {locale === 'es' ? 'Inicia sesión' : 'Sign in'}
          </a>{' '}
          {locale === 'es' ? 'para comentar.' : 'to comment.'}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">
          {locale === 'es' ? 'Cargando…' : 'Loading…'}
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {locale === 'es'
            ? 'Aún no hay comentarios. Sé la primera persona en aportar contexto.'
            : 'No comments yet. Be the first to add context.'}
        </p>
      ) : (
        <>
          {hiddenCount > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-5 w-full rounded-lg border border-[#2d3748] bg-[#11161f] px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-[#13202b]"
            >
              {locale === 'es'
                ? `Ver ${hiddenCount} comentario${hiddenCount === 1 ? '' : 's'} más`
                : `Show ${hiddenCount} earlier comment${hiddenCount === 1 ? '' : 's'}`}
            </button>
          )}

          <ul className="mt-5 space-y-3">
            {visible.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-[#2d3748] bg-[#11161f] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {c.author?.full_name ??
                      (locale === 'es' ? 'Vecino' : 'Neighbour')}
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

          {expanded && comments.length > COLLAPSED_VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-3 text-xs text-slate-500 underline hover:text-slate-300"
            >
              {locale === 'es' ? 'Ocultar comentarios antiguos' : 'Hide older comments'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
