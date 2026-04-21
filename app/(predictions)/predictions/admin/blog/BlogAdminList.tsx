'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PenLine,
  Eye,
  Archive,
  Send,
  RotateCcw,
  Plus,
  Loader2,
  Bot,
  Hash,
} from 'lucide-react'

export type BlogAdminRow = {
  id: string
  slug: string
  title: string
  title_en: string | null
  category: string
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  updated_at: string | null
  view_count: number | null
  cover_image_url: string | null
  generated_by: string | null
  pulse_market_id: string | null
  tags: string[] | null
}

type Locale = 'es' | 'en'
type StatusFilter = 'all' | 'draft' | 'published' | 'archived'

const COPY = {
  es: {
    title: 'Blog',
    lede: 'Administra artículos: publica borradores, archívalos o edítalos.',
    newPost: 'Nuevo post',
    filterAll: 'Todos',
    filterDraft: 'Borradores',
    filterPublished: 'Publicados',
    filterArchived: 'Archivados',
    empty: 'No hay posts en esta vista.',
    emptyAll: 'Aún no hay posts. Crea el primero.',
    colTitle: 'Título',
    colCategory: 'Categoría',
    colStatus: 'Estado',
    colViews: 'Vistas',
    colUpdated: 'Actualizado',
    colActions: 'Acciones',
    edit: 'Editar',
    view: 'Ver',
    publish: 'Publicar',
    unpublish: 'Despublicar',
    archiveAction: 'Archivar',
    restore: 'Restaurar',
    saving: 'Guardando…',
    statusDraft: 'Borrador',
    statusPublished: 'Publicado',
    statusArchived: 'Archivado',
    confirmArchive: '¿Archivar este post? No se mostrará en el blog público.',
    confirmPublish: '¿Publicar este post ahora?',
    aiBadge: 'IA',
    pulseBadge: 'Pulse',
    errorSave: 'No se pudo guardar. Intenta de nuevo.',
  },
  en: {
    title: 'Blog',
    lede: 'Manage articles: publish drafts, archive them, or edit.',
    newPost: 'New post',
    filterAll: 'All',
    filterDraft: 'Drafts',
    filterPublished: 'Published',
    filterArchived: 'Archived',
    empty: 'No posts in this view.',
    emptyAll: 'No posts yet. Create the first one.',
    colTitle: 'Title',
    colCategory: 'Category',
    colStatus: 'Status',
    colViews: 'Views',
    colUpdated: 'Updated',
    colActions: 'Actions',
    edit: 'Edit',
    view: 'View',
    publish: 'Publish',
    unpublish: 'Unpublish',
    archiveAction: 'Archive',
    restore: 'Restore',
    saving: 'Saving…',
    statusDraft: 'Draft',
    statusPublished: 'Published',
    statusArchived: 'Archived',
    confirmArchive: 'Archive this post? It will be hidden from the public blog.',
    confirmPublish: 'Publish this post now?',
    aiBadge: 'AI',
    pulseBadge: 'Pulse',
    errorSave: 'Could not save. Try again.',
  },
} as const

const CATEGORY_LABEL: Record<string, { es: string; en: string }> = {
  insight: { es: 'Insight', en: 'Insight' },
  pulse_analysis: { es: 'Análisis Pulse', en: 'Pulse analysis' },
  market_story: { es: 'Historia de mercado', en: 'Market story' },
  world_cup: { es: 'Mundial', en: 'World Cup' },
  behind_data: { es: 'Detrás de los datos', en: 'Behind the data' },
}

function formatDate(iso: string | null, locale: Locale) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type TCopy = (typeof COPY)[Locale]

function StatusPill({ status, t }: { status: BlogAdminRow['status']; t: TCopy }) {
  const map = {
    draft: { label: t.statusDraft, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    published: {
      label: t.statusPublished,
      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    },
    archived: { label: t.statusArchived, cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  } as const
  const cfg = map[status]
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export default function BlogAdminList({
  posts,
  locale,
}: {
  posts: BlogAdminRow[]
  locale: Locale
}) {
  const t = COPY[locale]
  const router = useRouter()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (filter === 'all') return posts
    return posts.filter((p) => p.status === filter)
  }, [posts, filter])

  const counts = useMemo(() => {
    const c = { all: posts.length, draft: 0, published: 0, archived: 0 }
    for (const p of posts) c[p.status] = (c[p.status] ?? 0) + 1
    return c
  }, [posts])

  const updateStatus = async (id: string, nextStatus: BlogAdminRow['status']) => {
    setError(null)
    setSavingId(id)
    try {
      const res = await fetch(`/api/predictions/admin/blog-posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        setError(t.errorSave)
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError(t.errorSave)
    } finally {
      setSavingId(null)
    }
  }

  const onPublish = (row: BlogAdminRow) => {
    if (!confirm(t.confirmPublish)) return
    void updateStatus(row.id, 'published')
  }
  const onUnpublish = (row: BlogAdminRow) => {
    void updateStatus(row.id, 'draft')
  }
  const onArchive = (row: BlogAdminRow) => {
    if (!confirm(t.confirmArchive)) return
    void updateStatus(row.id, 'archived')
  }
  const onRestore = (row: BlogAdminRow) => {
    void updateStatus(row.id, 'draft')
  }

  const filterButtons: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: 'all', label: t.filterAll, count: counts.all },
    { id: 'draft', label: t.filterDraft, count: counts.draft },
    { id: 'published', label: t.filterPublished, count: counts.published },
    { id: 'archived', label: t.filterArchived, count: counts.archived },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{t.lede}</p>
        </div>
        <Link
          href="/predictions/admin/blog/create"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t.newPost}
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {filterButtons.map((b) => {
          const active = filter === b.id
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setFilter(b.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-[#2d3748] bg-[#1a2029] text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {b.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-700/50 text-slate-300'
                }`}
              >
                {b.count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {posts.length === 0 ? t.emptyAll : t.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#2d3748] bg-[#111821] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t.colTitle}</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">{t.colCategory}</th>
                  <th className="px-4 py-3 font-medium">{t.colStatus}</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">{t.colViews}</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">{t.colUpdated}</th>
                  <th className="px-4 py-3 text-right font-medium">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const displayTitle =
                    locale === 'en' && row.title_en?.trim() ? row.title_en : row.title
                  const categoryLabel =
                    CATEGORY_LABEL[row.category]?.[locale] ?? row.category
                  const isAi = row.generated_by && row.generated_by !== 'manual'
                  const hasPulse = !!row.pulse_market_id
                  const busy = savingId === row.id
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[#2d3748] transition hover:bg-[#111821]/60"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/predictions/admin/blog/edit/${row.id}`}
                              className="block truncate font-medium text-white hover:text-emerald-300"
                              title={displayTitle}
                            >
                              {displayTitle}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-mono">/{row.slug}</span>
                              {isAi && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-purple-300">
                                  <Bot className="h-3 w-3" aria-hidden />
                                  {t.aiBadge}
                                </span>
                              )}
                              {hasPulse && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                                  <Hash className="h-3 w-3" aria-hidden />
                                  {t.pulseBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 align-top text-slate-300 md:table-cell">
                        {categoryLabel}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusPill status={row.status} t={t} />
                      </td>
                      <td className="hidden px-4 py-3 align-top text-slate-300 sm:table-cell">
                        {row.view_count ?? 0}
                      </td>
                      <td className="hidden px-4 py-3 align-top text-slate-400 md:table-cell">
                        {formatDate(row.updated_at, locale)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {busy && (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
                          )}
                          <Link
                            href={`/predictions/admin/blog/edit/${row.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#2d3748] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                            title={t.edit}
                          >
                            <PenLine className="h-3.5 w-3.5" aria-hidden />
                            <span className="hidden sm:inline">{t.edit}</span>
                          </Link>
                          {row.status === 'published' && (
                            <Link
                              href={`/blog/${row.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-[#2d3748] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                              title={t.view}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                              <span className="hidden sm:inline">{t.view}</span>
                            </Link>
                          )}
                          {row.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => onPublish(row)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                              title={t.publish}
                            >
                              <Send className="h-3.5 w-3.5" aria-hidden />
                              <span className="hidden sm:inline">{t.publish}</span>
                            </button>
                          )}
                          {row.status === 'published' && (
                            <button
                              type="button"
                              onClick={() => onUnpublish(row)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#2d3748] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-50"
                              title={t.unpublish}
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                              <span className="hidden sm:inline">{t.unpublish}</span>
                            </button>
                          )}
                          {row.status !== 'archived' && (
                            <button
                              type="button"
                              onClick={() => onArchive(row)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#2d3748] px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-50"
                              title={t.archiveAction}
                            >
                              <Archive className="h-3.5 w-3.5" aria-hidden />
                              <span className="hidden sm:inline">{t.archiveAction}</span>
                            </button>
                          )}
                          {row.status === 'archived' && (
                            <button
                              type="button"
                              onClick={() => onRestore(row)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#2d3748] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-50"
                              title={t.restore}
                            >
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                              <span className="hidden sm:inline">{t.restore}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
