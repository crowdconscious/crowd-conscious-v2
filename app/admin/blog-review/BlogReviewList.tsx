'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, ExternalLink } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'

export type ReviewRow = {
  id: string
  title: string
  slug: string | null
  authorName: string | null
  authorTrust: number
  submittedAt: string | null
}

export default function BlogReviewList({ rows, locale }: { rows: ReviewRow[]; locale: CreatorLocale }) {
  const t = getCreatorCopy(locale)
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const approve = async (id: string) => {
    setError('')
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/blog/${id}/approve`, { method: 'POST' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error ?? 'Error')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusyId(null)
    }
  }

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', { month: 'short', day: 'numeric' }) : ''

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{t.reviewTitle}</h1>
      <p className="mt-1 text-sm text-slate-400">{t.reviewSubtitle}</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">{t.reviewEmpty}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-[#2d3748] bg-[#1a2029] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{r.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {t.reviewAuthor}: {r.authorName ?? '—'} · {t.reviewTrust}: {r.authorTrust} · {t.reviewSubmitted}:{' '}
                  {fmt(r.submittedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.slug && (
                  <Link
                    href={`/blog/${r.slug}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    <ExternalLink className="h-4 w-4" /> {t.reviewPreview}
                  </Link>
                )}
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void approve(r.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {busyId === r.id ? t.reviewApproving : t.reviewApprove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
