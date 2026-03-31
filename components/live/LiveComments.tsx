'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type LiveCommentRow = {
  id: string
  live_event_id: string
  user_id: string | null
  anonymous_participant_id: string | null
  content: string
  author_display_name: string
  author_avatar: string | null
  created_at: string
}

export type LiveCommentsProps = {
  eventId: string
  locale: 'en' | 'es'
  /** Shown as “Commenting as …” (auth user or alias). */
  displayName: string
}

type Props = LiveCommentsProps

const RATE_MS = 5000

export function LiveComments({ eventId, displayName, locale }: Props) {
  const es = locale === 'es'
  const [comments, setComments] = useState<LiveCommentRow[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastSendRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = useRef(createClient()).current
  const seenIds = useRef(new Set<string>())

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/live/comments?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ comments?: LiveCommentRow[] }>)
      .then((data) => {
        if (cancelled) return
        const list = data.comments ?? []
        for (const c of list) seenIds.current.add(c.id)
        setComments(list)
      })
      .catch(() => {
        if (!cancelled) setError(es ? 'No se pudieron cargar los comentarios' : 'Could not load comments')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId, es])

  useEffect(() => {
    scrollToBottom()
  }, [comments, scrollToBottom])

  useEffect(() => {
    let ch: RealtimeChannel | null = null
    try {
      ch = supabase
        .channel(`live_comments:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_comments',
            filter: `live_event_id=eq.${eventId}`,
          },
          (payload) => {
            const row = payload.new as LiveCommentRow
            if (!row?.id || seenIds.current.has(row.id)) return
            seenIds.current.add(row.id)
            setComments((prev) => {
              if (prev.some((c) => c.id === row.id)) return prev
              return [...prev, row]
            })
          }
        )
        .subscribe()
    } catch {
      /* Realtime optional */
    }
    return () => {
      if (ch) void supabase.removeChannel(ch)
    }
  }, [eventId, supabase])

  const send = async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > 500) return
    const now = Date.now()
    if (now - lastSendRef.current < RATE_MS) {
      setError(es ? 'Espera unos segundos…' : 'Wait a few seconds…')
      return
    }
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/live/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ live_event_id: eventId, content: trimmed }),
      })
      const data = (await res.json()) as { error?: string; comment?: LiveCommentRow }
      if (!res.ok) throw new Error(data.error || 'Failed')
      lastSendRef.current = Date.now()
      setText('')
      if (data.comment?.id) {
        if (!seenIds.current.has(data.comment.id)) {
          seenIds.current.add(data.comment.id)
          setComments((prev) => (prev.some((c) => c.id === data.comment!.id) ? prev : [...prev, data.comment!]))
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : es ? 'Error al enviar' : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        {es ? '💬 Chat en vivo' : '💬 Live chat'}
      </h3>
      <p className="mb-2 text-xs text-slate-500">
        {es ? 'Comentando como' : 'Commenting as'} <span className="text-emerald-400/90">{displayName}</span>
      </p>

      <div
        ref={scrollRef}
        className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[#2d3748]/80 bg-[#0f1419]/50 p-3"
      >
        {loading && (
          <p className="text-center text-xs text-slate-500">{es ? 'Cargando…' : 'Loading…'}</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-center text-xs text-slate-500">
            {es ? 'Sé el primero en comentar.' : 'Be the first to comment.'}
          </p>
        )}
        {comments.map((c) => {
          const pic = c.author_avatar?.trim() || '👤'
          const isUrl = pic.startsWith('http://') || pic.startsWith('https://')
          return (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="shrink-0 text-base leading-none">
                {isUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pic} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-lg">
                    {pic}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-emerald-400">{c.author_display_name}</p>
                <p className="text-gray-200">{c.content}</p>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={es ? 'Escribe un mensaje…' : 'Type a message…'}
          className="min-h-[44px] flex-1 rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none"
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
          className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {es ? 'Enviar' : 'Send'}
        </button>
      </div>
    </div>
  )
}
