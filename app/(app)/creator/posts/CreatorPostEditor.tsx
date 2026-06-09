'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MarkdownEditor } from '@/components/admin/MarkdownEditor'
import { SourcesInput, type SourceItem } from '@/components/blog/SourcesInput'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'

export type CreatorEditablePost = {
  id: string
  title: string
  title_en: string | null
  excerpt: string | null
  excerpt_en: string | null
  content: string | null
  content_en: string | null
  category: string
  cover_image_url: string | null
  sources: SourceItem[]
  status: string
  slug: string | null
}

const CATEGORIES = [
  { id: 'insight', label: 'Insight' },
  { id: 'pulse_analysis', label: 'Pulse analysis' },
  { id: 'market_story', label: 'Market story' },
  { id: 'world_cup', label: 'World Cup' },
  { id: 'behind_data', label: 'Behind the data' },
] as const

const input =
  'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50'

type Props = {
  locale: CreatorLocale
  /** When provided the editor edits an existing post; otherwise it creates one. */
  post?: CreatorEditablePost
  /** creator_trust_level >= 2 — may self-publish. */
  canPublish: boolean
}

export default function CreatorPostEditor({ locale, post, canPublish }: Props) {
  const t = getCreatorCopy(locale)
  const router = useRouter()
  const isEdit = !!post

  const [title, setTitle] = useState(post?.title ?? '')
  const [titleEn, setTitleEn] = useState(post?.title_en ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [excerptEn, setExcerptEn] = useState(post?.excerpt_en ?? '')
  const [content, setContent] = useState(post?.content ?? '')
  const [contentEn, setContentEn] = useState(post?.content_en ?? '')
  const [category, setCategory] = useState<string>(post?.category ?? 'insight')
  const [coverUrl, setCoverUrl] = useState<string | null>(post?.cover_image_url ?? null)
  const [sources, setSources] = useState<SourceItem[]>(post?.sources ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const save = useCallback(
    async (status: 'draft' | 'pending_review' | 'published') => {
      setError('')
      setNotice('')
      if (!title.trim() || !excerpt.trim() || !content.trim()) {
        setError(t.editorRequired)
        return
      }
      setSubmitting(true)
      try {
        const payload = {
          title,
          title_en: titleEn,
          excerpt,
          excerpt_en: excerptEn,
          content,
          content_en: contentEn,
          category,
          cover_image_url: coverUrl,
          sources: sources.filter((s) => s.url.trim()),
          status,
        }

        const res = isEdit
          ? await fetch(`/api/creator/posts/${post!.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
          : await fetch('/api/creator/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })

        const json = (await res.json().catch(() => ({}))) as {
          slug?: string
          status?: string
          publishBlocked?: boolean
          error?: string
        }

        if (!res.ok) {
          if (json.error === 'forbidden_or_locked') {
            setError(t.editorPublishLocked)
          } else {
            setError(json.error ?? 'Error')
          }
          return
        }

        if (json.publishBlocked) {
          setNotice(t.editorPublishLocked)
        }

        if (json.status === 'published' && json.slug) {
          router.push(`/blog/${json.slug}`)
        } else {
          router.push('/creator')
        }
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setSubmitting(false)
      }
    },
    [
      title,
      titleEn,
      excerpt,
      excerptEn,
      content,
      contentEn,
      category,
      coverUrl,
      sources,
      isEdit,
      post,
      router,
      t,
    ]
  )

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/creator" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {t.editorBack}
      </Link>
      <h1 className="text-2xl font-bold text-white">{isEdit ? t.editorEditTitle : t.editorNewTitle}</h1>
      <p className="mt-1 text-sm text-slate-400">{t.editorIntro}</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {notice}
        </div>
      )}

      <div className="mt-8 space-y-6">
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorTitleEs}</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorTitleEn}</label>
          <input className={input} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorExcerptEs}</label>
          <textarea className={`${input} min-h-[80px]`} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorExcerptEn}</label>
          <textarea className={`${input} min-h-[80px]`} value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorContentEs}</label>
          <MarkdownEditor value={content} onChange={setContent} minHeight={320} label={t.editorContentEs} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorContentEn}</label>
          <MarkdownEditor value={contentEn} onChange={setContentEn} minHeight={220} label={t.editorContentEn} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorCategory}</label>
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">{t.editorSources}</label>
          <p className="mb-2 text-xs text-slate-500">{t.editorSourcesHint}</p>
          <SourcesInput value={sources} onChange={setSources} locale={locale} />
        </div>
        <div>
          <span className="mb-2 block text-sm text-slate-400">{t.editorCover}</span>
          <ImageUpload
            currentUrl={coverUrl}
            onUpload={(url) => setCoverUrl(url)}
            onClear={() => setCoverUrl(null)}
            storagePath="blog"
            label={t.editorCover}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void save('draft')}
            className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {submitting ? t.editorSaving : t.editorSaveDraft}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void save('pending_review')}
            className="rounded-lg border border-emerald-600/50 px-5 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-50"
          >
            {t.editorSubmitReview}
          </button>
          {canPublish && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void save('published')}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {t.editorPublish}
            </button>
          )}
        </div>
        {!canPublish && <p className="text-xs text-slate-500">{t.editorPublishLocked}</p>}
      </div>
    </div>
  )
}
