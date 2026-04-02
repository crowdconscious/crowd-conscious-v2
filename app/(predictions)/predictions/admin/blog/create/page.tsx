'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'

const CATEGORIES = [
  { id: 'insight', label: 'Insight' },
  { id: 'pulse_analysis', label: 'Pulse analysis' },
  { id: 'market_story', label: 'Market story' },
  { id: 'world_cup', label: 'World Cup' },
  { id: 'behind_data', label: 'Behind the data' },
] as const

const input =
  'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50'

export default function AdminBlogCreatePage() {
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [excerptEn, setExcerptEn] = useState('')
  const [content, setContent] = useState('')
  const [contentEn, setContentEn] = useState('')
  const [category, setCategory] = useState<string>('insight')
  const [tags, setTags] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const autoSlug = useCallback(() => {
    const s = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)
      .replace(/-$/, '')
    setSlug(s)
  }, [title])

  const submit = async (publishNow: boolean) => {
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          title_en: titleEn,
          slug: slug.trim() || undefined,
          excerpt,
          excerpt_en: excerptEn,
          content,
          content_en: contentEn,
          category,
          tags,
          meta_description: metaDescription,
          cover_image_url: coverUrl,
          publish_now: publishNow,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? res.statusText)
      const s = json.post?.slug as string
      if (s) window.location.href = `/blog/${s}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/predictions/admin/agents"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>
      <h1 className="text-2xl font-bold text-white">Write blog post</h1>
      <p className="mt-1 text-slate-400 text-sm">Manual draft or publish. Markdown supported in body.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-6">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Title (ES) *</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Title (EN)</label>
          <input className={input} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Slug</label>
          <div className="flex gap-2">
            <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" />
            <button
              type="button"
              onClick={autoSlug}
              className="shrink-0 rounded-lg border border-slate-600 px-3 text-sm text-slate-300 hover:bg-slate-800"
            >
              Generate
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Excerpt (ES) *</label>
          <textarea className={`${input} min-h-[80px]`} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Excerpt (EN)</label>
          <textarea className={`${input} min-h-[80px]`} value={excerptEn} onChange={(e) => setExcerptEn(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Content (ES) * markdown</label>
          <textarea
            className={`${input} min-h-[240px] font-mono text-sm`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Content (EN)</label>
          <textarea
            className={`${input} min-h-[200px] font-mono text-sm`}
            value={contentEn}
            onChange={(e) => setContentEn(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Category</label>
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Tags (comma-separated)</label>
          <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Meta description</label>
          <input className={input} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
        </div>
        <div>
          <span className="mb-2 block text-sm text-slate-400">Cover image</span>
          <ImageUpload
            currentUrl={coverUrl}
            onUpload={(url) => setCoverUrl(url)}
            storagePath="blog"
            label="Upload cover"
            hint="PNG, JPG, WebP"
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit(false)}
            className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit(true)}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}
