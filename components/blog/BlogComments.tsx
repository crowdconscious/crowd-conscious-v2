'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import { Loader2, MessageCircle } from 'lucide-react'

type CommentRow = {
  id: string
  author_name: string
  author_avatar: string | null
  content: string
  created_at: string
}

export function BlogComments({
  blogPostId,
  locale = 'es',
}: {
  blogPostId: string
  locale?: 'en' | 'es'
}) {
  const es = locale === 'es'
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [canComment, setCanComment] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/blog/posts/${blogPostId}/comments`, { cache: 'no-store' })
    const json = (await res.json()) as { comments?: CommentRow[] }
    if (res.ok && Array.isArray(json.comments)) {
      setComments(json.comments)
    }
    setLoading(false)
  }, [blogPostId])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCanComment(true)
        setAuthReady(true)
        return
      }
      void fetch('/api/live/anonymous-session', { cache: 'no-store' })
        .then((r) => r.json() as Promise<{ participant?: { id: string } | null }>)
        .then((j) => {
          if (j.participant?.id) setCanComment(true)
        })
        .catch(() => {})
        .finally(() => setAuthReady(true))
    })
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length < 1 || trimmed.length > 1000) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/blog/posts/${blogPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      const json = (await res.json()) as { error?: string; comment?: CommentRow }
      if (!res.ok) {
        setError(json.error ?? (es ? 'No se pudo enviar' : 'Could not post'))
        setSubmitting(false)
        return
      }
      if (json.comment) {
        setComments((prev) => [...prev, json.comment!])
        setText('')
      }
    } catch {
      setError(es ? 'Error de red' : 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return es ? 'ahora' : 'just now'
    if (mins < 60) return es ? `hace ${mins} min` : `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return es ? `hace ${hours} h` : `${hours}h ago`
    return d.toLocaleDateString(es ? 'es-MX' : 'en-US', { dateStyle: 'medium' })
  }

  return (
    <section className="mt-12 border-t border-[#2d3748] pt-8">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
        <MessageCircle className="h-5 w-5 text-emerald-400" aria-hidden />
        {es ? 'Discusión' : 'Discussion'}
        <span className="text-sm font-normal text-slate-500">({comments.length})</span>
      </h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500/60" />
        </div>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-white/10 bg-[#1a2029] p-4"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {c.author_avatar?.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.author_avatar}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : c.author_avatar ? (
                  <span className="text-base leading-none" aria-hidden>
                    {c.author_avatar}
                  </span>
                ) : null}
                <span className="text-sm font-medium text-emerald-400">{c.author_name}</span>
                <span className="text-xs text-slate-500">{formatTime(c.created_at)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {!authReady ? (
        <div className="mt-8 flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500/50" />
        </div>
      ) : canComment ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <label className="block">
            <span className="sr-only">{es ? 'Comentario' : 'Comment'}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder={es ? 'Escribe tu comentario…' : 'Write a comment…'}
              className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-gray-200 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <span className="mt-1 block text-right text-xs text-slate-500">{text.length}/1000</span>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || text.trim().length < 1}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : es ? (
              'Enviar'
            ) : (
              'Post'
            )}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-slate-400">
          {es ? (
            <>
              ¿No tienes cuenta?{' '}
              <Link href="/login" className="text-emerald-400 hover:underline">
                Inicia sesión
              </Link>{' '}
              para comentar. También puedes usar tu alias de{' '}
              <Link href="/live" className="text-emerald-400 hover:underline">
                Conscious Live
              </Link>
              .
            </>
          ) : (
            <>
              <Link href="/login" className="text-emerald-400 hover:underline">
                Sign in
              </Link>{' '}
              to comment, or use your Live event alias.
            </>
          )}
        </p>
      )}

    </section>
  )
}
