'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { Database } from '@/types/database'
import BlogPulseEmbedFields from '@/components/blog/BlogPulseEmbedFields'
import {
  normalizePulseEmbedComponents,
  parsePulseEmbedPosition,
  PULSE_EMBED_COMPONENT_KEYS,
  type PulseEmbedComponentKey,
  type PulseEmbedPosition,
} from '@/lib/pulse-embed-constants'

type Row = Database['public']['Tables']['blog_posts']['Row']

const CATEGORIES = [
  { id: 'insight', label: 'Insight' },
  { id: 'pulse_analysis', label: 'Pulse analysis' },
  { id: 'market_story', label: 'Market story' },
  { id: 'world_cup', label: 'World Cup' },
  { id: 'behind_data', label: 'Behind the data' },
] as const

const input =
  'w-full px-4 py-2.5 bg-[#1a2029] border border-[#2d3748] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50'

export default function EditBlogPostClient({ post }: { post: Row }) {
  const router = useRouter()
  const [title, setTitle] = useState(post.title)
  const [titleEn, setTitleEn] = useState(post.title_en ?? '')
  const [slug, setSlug] = useState(post.slug)
  const [excerpt, setExcerpt] = useState(post.excerpt)
  const [excerptEn, setExcerptEn] = useState(post.excerpt_en ?? '')
  const [content, setContent] = useState(post.content)
  const [contentEn, setContentEn] = useState(post.content_en ?? '')
  const [category, setCategory] = useState<string>(post.category)
  const [tags, setTags] = useState((post.tags ?? []).join(', '))
  const [metaDescription, setMetaDescription] = useState(post.meta_description ?? '')
  const [relatedIds, setRelatedIds] = useState((post.related_market_ids ?? []).join(', '))
  const [coverUrl, setCoverUrl] = useState<string | null>(post.cover_image_url)
  const [embedEnabled, setEmbedEnabled] = useState(!!post.pulse_market_id)
  const [pulseMarketId, setPulseMarketId] = useState<string | null>(post.pulse_market_id ?? null)
  const [pulseEmbedPosition, setPulseEmbedPosition] = useState<PulseEmbedPosition>(() =>
    parsePulseEmbedPosition(post.pulse_embed_position)
  )
  const [pulseComponents, setPulseComponents] = useState<PulseEmbedComponentKey[]>(() =>
    normalizePulseEmbedComponents(post.pulse_embed_components)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const togglePulseComponent = (key: PulseEmbedComponentKey, checked: boolean) => {
    setPulseComponents((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return PULSE_EMBED_COMPONENT_KEYS.filter((k) => next.has(k))
    })
  }

  const save = useCallback(
    async (opts: { publish?: boolean; archive?: boolean }) => {
      setError('')
      if (!title.trim() || !excerpt.trim() || !content.trim()) {
        setError('Title, excerpt, and content (ES) are required.')
        return
      }
      setSubmitting(true)
      try {
        const related_market_ids = relatedIds
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter((s) => /^[0-9a-f-]{36}$/i.test(s))

        const body: Record<string, unknown> = {
          title,
          title_en: titleEn,
          slug,
          excerpt,
          excerpt_en: excerptEn,
          content,
          content_en: contentEn,
          category,
          tags,
          meta_description: metaDescription,
          related_market_ids,
          cover_image_url: coverUrl,
          pulse_market_id: embedEnabled ? pulseMarketId : null,
          pulse_embed_position: pulseEmbedPosition,
          pulse_embed_components: pulseComponents,
        }
        if (opts.publish) body.status = 'published'
        if (opts.archive) body.status = 'archived'

        const res = await fetch(`/api/predictions/admin/blog-posts/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error ?? res.statusText)
        router.push(`/blog/${json.post?.slug ?? slug}`)
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
      slug,
      excerpt,
      excerptEn,
      content,
      contentEn,
      category,
      tags,
      metaDescription,
      relatedIds,
      coverUrl,
      embedEnabled,
      pulseMarketId,
      pulseEmbedPosition,
      pulseComponents,
      post.id,
      router,
    ]
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/predictions/admin/agents"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to agents
      </Link>
      <h1 className="text-2xl font-bold text-white">Edit blog post</h1>
      <p className="mt-1 text-sm text-slate-400">
        Markdown bodies: use <code className="text-emerald-400/90">[link text](https://…)</code> for clickable links. Raw{' '}
        <code className="text-emerald-400/90">[https://…]</code> after text is auto-fixed on the public blog.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
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
          <label className="mb-1 block text-sm text-slate-400">Slug *</label>
          <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} />
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
          <label className="mb-1 block text-sm text-slate-400">Content (ES) * — markdown</label>
          <textarea
            className={`${input} min-h-[280px] font-mono text-sm`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Content (EN) — markdown</label>
          <textarea
            className={`${input} min-h-[220px] font-mono text-sm`}
            value={contentEn}
            onChange={(e) => setContentEn(e.target.value)}
          />
        </div>

        <BlogPulseEmbedFields
          embedEnabled={embedEnabled}
          onEmbedEnabledChange={(v) => {
            setEmbedEnabled(v)
            if (!v) setPulseMarketId(null)
          }}
          pulseMarketId={pulseMarketId}
          onPulseMarketIdChange={setPulseMarketId}
          pulseEmbedPosition={pulseEmbedPosition}
          onPulseEmbedPositionChange={setPulseEmbedPosition}
          selectedComponents={pulseComponents}
          onToggleComponent={togglePulseComponent}
        />

        <div>
          <label className="mb-1 block text-sm text-slate-400">Related market IDs (UUIDs, comma-separated)</label>
          <input
            className={input}
            value={relatedIds}
            onChange={(e) => setRelatedIds(e.target.value)}
            placeholder="uuid1, uuid2"
          />
          <p className="mt-1 text-xs text-slate-500">Powers the “Related markets” cards at the bottom.</p>
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
            hint="PNG, JPG, WebP — add sponsor logo in the article body if needed."
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void save({})}
            className="rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Save changes
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void save({ publish: true })}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Save & publish
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void save({ archive: true })}
            className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Archive
          </button>
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            View on blog
          </Link>
        </div>
      </div>
    </div>
  )
}
