'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BlogDraftBar({ postId }: { postId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function publish() {
    setErr('')
    setLoading(true)
    try {
      const res = await fetch(`/api/predictions/admin/blog-posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? res.statusText)
      }
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-sm font-bold text-amber-400">PREVIEW — DRAFT</span>
          <p className="mt-1 text-sm text-slate-400">
            This post is not published yet. Only admins see this page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void publish()}
          disabled={loading}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Publishing…' : 'Publish now'}
        </button>
      </div>
      {err ? <p className="mt-2 text-xs text-red-400">{err}</p> : null}
    </div>
  )
}
