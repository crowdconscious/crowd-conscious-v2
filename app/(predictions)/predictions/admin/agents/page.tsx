'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Minus,
  Play,
  ExternalLink,
  Bot,
  FileText,
  Newspaper,
  Inbox,
  Lightbulb,
} from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'

const AGENTS = [
  { id: 'ceo-digest', label: 'CEO Digest', icon: FileText },
  { id: 'content-creator', label: 'Content Creator', icon: Bot },
  { id: 'news-monitor', label: 'News Monitor', icon: Newspaper },
  { id: 'inbox-curator', label: 'Inbox Curator', icon: Inbox },
] as const

type AgentRun = {
  id: string
  agent_name: string
  status: string
  duration_ms: number
  tokens_input: number
  tokens_output: number
  cost_estimate: number
  error_message: string | null
  created_at: string
}

type AgentContent = {
  id: string
  content_type: string
  title: string
  body: string
  metadata: Record<string, unknown>
  published: boolean
  created_at: string
  market_id?: string | null
  agent_type?: string
  archived_at?: string | null
}

type TabId = 'all' | 'ceo' | 'news' | 'inbox' | 'suggestions' | 'blog'

function formatDate(t: string) {
  return new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(t: string) {
  const d = new Date(t)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(t)
}

type StructuredBriefPayload = {
  summary?: string
  signals?: Array<{
    headline?: string
    source?: string
    relevance?: string
    category?: string
    market_angle?: string
    suggested_question?: string
    key_fact?: string
  }>
  top_3_actionable?: string[]
}

function StructuredNewsBriefCard({
  item,
  onArchive,
}: {
  item: AgentContent
  onArchive: () => void
}) {
  let data: StructuredBriefPayload | null = null
  try {
    data = JSON.parse(item.body) as StructuredBriefPayload
  } catch {
    data = null
  }
  if (!data) {
    return (
      <div className="border border-white/10 rounded-lg p-4 space-y-3">
        <h4 className="text-white font-medium text-sm">{item.title}</h4>
        <p className="text-white/70 text-sm whitespace-pre-wrap">{item.body}</p>
      </div>
    )
  }
  return (
    <div className="border border-white/10 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-sm">{item.title}</h4>
        <span className="text-white/40 text-xs">{formatRelativeTime(item.created_at)}</span>
      </div>
      {data.summary && (
        <p className="text-slate-300 text-sm leading-relaxed">{data.summary}</p>
      )}
      {data.top_3_actionable && data.top_3_actionable.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <h4 className="text-emerald-400 text-sm font-semibold mb-2">Acciones de hoy</h4>
          <ul className="space-y-1">
            {data.top_3_actionable.map((line, i) => (
              <li key={i} className="text-slate-300 text-sm">
                • {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(data.signals ?? []).map((signal, i) => (
        <div
          key={i}
          className="bg-slate-900/80 rounded-lg p-3 border border-slate-700/80"
        >
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                signal.relevance === 'high'
                  ? 'bg-red-500/20 text-red-400'
                  : signal.relevance === 'medium'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {signal.relevance ?? '—'}
            </span>
            {signal.source && (
              <span className="text-slate-500 text-xs">{signal.source}</span>
            )}
            {signal.category && (
              <span className="text-slate-600 text-xs">{signal.category}</span>
            )}
          </div>
          {signal.headline && (
            <h4 className="text-white text-sm font-medium">{signal.headline}</h4>
          )}
          {signal.key_fact && (
            <p className="text-slate-400 text-xs mt-1">{signal.key_fact}</p>
          )}
          {signal.market_angle && (
            <p className="text-emerald-400/80 text-xs mt-1 italic">
              Ángulo mercado: {signal.market_angle}
            </p>
          )}
          {signal.suggested_question && (
            <p className="text-amber-400/80 text-xs mt-1">
              &ldquo;{signal.suggested_question}&rdquo;
            </p>
          )}
        </div>
      ))}
      {!item.archived_at && (
        <button
          type="button"
          onClick={onArchive}
          className="text-slate-500 hover:text-slate-300 text-xs"
        >
          📦 Archive
        </button>
      )}
    </div>
  )
}

function getContentTab(item: AgentContent): TabId | null {
  const meta = item.metadata ?? {}
  const type = meta.type as string
  const digestType = meta.digest_type as string
  if (item.content_type === 'blog_post') return 'blog'
  if (type === 'inbox_digest') return 'inbox'
  if (item.content_type === 'market_suggestion' || (item.content_type === 'market_insight' && type === 'market_suggestion')) return 'suggestions'
  if (
    type === 'news_brief' ||
    type === 'news_relevance' ||
    type === 'structured_news_brief' ||
    item.content_type === 'news_summary'
  )
    return 'news'
  if (digestType === 'ceo_digest' || (item.content_type === 'weekly_digest' && type === 'ceo_digest'))
    return 'ceo'
  return 'all'
}

export default function AdminAgentsPage() {
  const router = useRouter()
  type BlogPostRow = {
    id: string
    slug: string
    title: string
    excerpt: string
    status: string
    published_at: string | null
    created_at: string
    category: string
    cover_image_url: string | null
  }

  const [data, setData] = useState<{
    agentRuns: AgentRun[]
    lastRunsByAgent: Record<string, AgentRun>
    monthlyStats: { totalCost: number; totalRuns: number; totalErrors: number }
    agentContent: AgentContent[]
    blogPosts: BlogPostRow[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [runResult, setRunResult] = useState<string | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [showArchived, setShowArchived] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/predictions/admin/agents?includeArchived=${showArchived ? '1' : '0'}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(res.status === 403 ? 'Admin access required' : json.error ?? res.statusText)
      }
      const json = await res.json()
      setData(json)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const runAgent = async (agentId: string) => {
    setRunning(agentId)
    setRunResult(null)
    setError('')
    try {
      const res = await fetch('/api/predictions/admin/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId }),
      })
      let json: { error?: string; result?: { summary?: Record<string, unknown> } }
      try {
        json = await res.json()
      } catch {
        throw new Error(`Agent run failed with status ${res.status}. Response was not JSON (e.g. 504 timeout). The agent may still be running — check Vercel logs.`)
      }
      if (!res.ok) {
        throw new Error(json.error ?? `Agent run failed with status ${res.status}`)
      }
      await fetchData()
      const result = json.result
      if (result?.summary && agentId === 'news-monitor') {
        const s = result.summary
        const parts: string[] = []
        if (typeof s.brief_saved === 'boolean') parts.push(`Brief: ${s.brief_saved ? 'saved' : 'skipped'}`)
        if (typeof s.suggestions_saved === 'number') parts.push(`Suggestions: ${s.suggestions_saved}`)
        if (typeof s.articles_fetched === 'number') parts.push(`Articles: ${s.articles_fetched}`)
        if (parts.length > 0) {
          setRunResult(parts.join(' • '))
          setTimeout(() => setRunResult(null), 8000)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Run failed'
      setError(`${msg} The agent may still be running — check Vercel logs.`)
    } finally {
      setRunning(null)
    }
  }

  const updateBlogPost = async (id: string, status: 'draft' | 'published' | 'archived') => {
    try {
      const res = await fetch(`/api/predictions/admin/blog-posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  const saveBlogCover = async (id: string, url: string) => {
    try {
      const res = await fetch(`/api/predictions/admin/blog-posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_image_url: url }),
      })
      if (!res.ok) throw new Error('Cover update failed')
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cover update failed')
    }
  }

  const archiveAgentItem = async (id: string) => {
    try {
      const res = await fetch('/api/predictions/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'agent_content', id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Archive failed')
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed')
    }
  }

  const dismissSuggestion = async (id: string) => {
    try {
      const res = await fetch('/api/predictions/admin/dismiss-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Dismiss failed')
      await fetchData()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dismiss failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  const content = (data?.agentContent ?? []).filter(
    (c) => c.content_type !== 'blog_post' && c.content_type !== 'social_post'
  )
  const blogPosts = data?.blogPosts ?? []
  const filteredContent =
    activeTab === 'blog'
      ? []
      : activeTab === 'all'
        ? content
        : content.filter((c) => {
            const tab = getContentTab(c)
            if (activeTab === 'ceo') return tab === 'ceo'
            if (activeTab === 'news') return tab === 'news'
            if (activeTab === 'inbox') return tab === 'inbox'
            if (activeTab === 'suggestions') return tab === 'suggestions'
            if (activeTab === 'blog') return tab === 'blog'
            return true
          })

  const lastRuns = data?.lastRunsByAgent ?? {}
  const stats = data?.monthlyStats ?? { totalCost: 0, totalRuns: 0, totalErrors: 0 }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const newsSummaryCount = content.filter(
    (c) =>
      c.content_type === 'news_summary' &&
      (c.agent_type === 'news_monitor' || !c.agent_type) &&
      c.created_at >= twentyFourHoursAgo
  ).length
  const pendingSuggestions = content.filter(
    (c) =>
      (c.content_type === 'market_suggestion' ||
        (c.content_type === 'market_insight' && (c.metadata as { type?: string })?.type === 'market_suggestion')) &&
      !c.published
  ).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Monitor agent health and review generated content
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {runResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-emerald-400">
          Run complete: {runResult}
        </div>
      )}

      {/* SECTION 1: AGENT HEALTH */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Agent Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS.map(({ id, label, icon: Icon }) => {
            const run = lastRuns[id]
            const statusIcon =
              run?.status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : run?.status === 'error' ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Minus className="w-5 h-5 text-amber-500" />
              )
            return (
              <div
                key={id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-white">{label}</span>
                  </div>
                  {statusIcon}
                </div>
                {run ? (
                  <>
                    <div className="text-sm text-slate-400">
                      Last run: {formatDate(run.created_at)}
                    </div>
                    {run.status === 'error' && run.error_message && (
                      <div
                        className="text-xs text-red-400 truncate cursor-help"
                        title={run.error_message}
                      >
                        Error: {run.error_message.split('|')[0]?.trim().slice(0, 60)}
                        {(run.error_message.split('|')[0]?.trim().length ?? 0) > 60 ? '…' : ''}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>
                        Tokens: {run.tokens_input + run.tokens_output} (in: {run.tokens_input},
                        out: {run.tokens_output})
                      </div>
                      <div>Cost: ${Number(run.cost_estimate ?? 0).toFixed(6)}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">No runs yet</div>
                )}
                <button
                  onClick={() => runAgent(id)}
                  disabled={!!running}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <Play className="w-4 h-4" />
                  {running === id ? 'Running...' : 'Run Now'}
                </button>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex gap-6 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <div>
            <span className="text-slate-400">Total cost this month:</span>{' '}
            <span className="text-white font-medium">${stats.totalCost.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-slate-400">Total runs:</span>{' '}
            <span className="text-white font-medium">{stats.totalRuns}</span>
          </div>
          <div>
            <span className="text-slate-400">Errors:</span>{' '}
            <span className="text-red-400 font-medium">{stats.totalErrors}</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: RECENT CONTENT */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Content</h2>
          <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-emerald-500"
            />
            Show archived
          </label>
          {showArchived && (
            <span className="text-gray-500 text-xs">
              ({content.filter((c) => c.archived_at).length} archived)
            </span>
          )}
        </div>
        <div className="flex gap-4 text-sm text-white/50 mb-4">
          <span>📰 {newsSummaryCount} análisis hoy</span>
          <span>💡 {pendingSuggestions} sugerencias pendientes</span>
          <span>📊 {stats.totalRuns} runs este mes</span>
          {stats.totalErrors > 0 && (
            <span className="text-red-400">{stats.totalErrors} errores</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <Link
            href="/predictions/admin/blog/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"
          >
            Write post
          </Link>
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: 'all' as TabId, label: 'All' },
            { id: 'ceo' as TabId, label: 'CEO Digests' },
            { id: 'news' as TabId, label: 'News Briefs' },
            { id: 'inbox' as TabId, label: 'Inbox Digests' },
            { id: 'suggestions' as TabId, label: 'Market Suggestions' },
            { id: 'blog' as TabId, label: 'Blog Posts' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {activeTab === 'blog' ? (
            blogPosts.length === 0 ? (
              <div className="text-slate-500 py-8 text-center">No blog drafts yet. Run Content Creator.</div>
            ) : (
              blogPosts.map((bp) => (
                <div
                  key={bp.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-4 max-w-md">
                        <span className="text-gray-300 text-sm font-medium block mb-2">Cover image</span>
                        <ImageUpload
                          currentUrl={bp.cover_image_url?.trim() || null}
                          onUpload={(url) => void saveBlogCover(bp.id, url)}
                          storagePath="blog"
                          label="Upload cover"
                          hint="PNG, JPG, WebP · max 2MB"
                        />
                      </div>
                      <span className="text-xs uppercase text-emerald-400/90">{bp.category}</span>
                      <h3 className="text-white font-semibold text-lg">{bp.title}</h3>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-3">{bp.excerpt}</p>
                      <p className="text-slate-500 text-xs mt-2">
                        {formatDate(bp.created_at)} · status:{' '}
                        <span className="text-slate-300">{bp.status}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/blog/${bp.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </Link>
                      {bp.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() => updateBlogPost(bp.id, 'published')}
                          className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium"
                        >
                          Publish
                        </button>
                      )}
                      {bp.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => updateBlogPost(bp.id, 'archived')}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                        >
                          Archive
                        </button>
                      )}
                      {bp.status === 'archived' && (
                        <button
                          type="button"
                          onClick={() => updateBlogPost(bp.id, 'draft')}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                        >
                          Restore draft
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : filteredContent.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">No content in this category</div>
          ) : (
            filteredContent.map((item) => {
              const meta = item.metadata ?? {}
              const type = meta.type as string

              if ((meta.digest_type as string) === 'ceo_digest' || (item.content_type === 'weekly_digest' && type === 'ceo_digest')) {
                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="text-slate-400 text-sm mb-2">{formatDate(item.created_at)}</div>
                    <pre className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {item.body}
                    </pre>
                  </div>
                )
              }

              if (type === 'market_suggestion' || item.content_type === 'market_suggestion' || item.content_type === 'market_insight') {
                let suggestion: Record<string, unknown> = {}
                try {
                  suggestion = JSON.parse(item.body) as Record<string, unknown>
                } catch {
                  suggestion = { title: item.title }
                }
                const createUrl = `/predictions/admin/create-market?suggestion_id=${encodeURIComponent(item.id)}`

                return (
                  <div
                    key={item.id}
                    className="border border-white/10 rounded-lg p-4 space-y-3"
                  >
                    <h4 className="text-white font-medium">{item.title}</h4>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        {String(suggestion.category ?? '—')}
                      </span>
                      {suggestion.initial_probability != null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                          {String(suggestion.initial_probability)}% initial
                        </span>
                      )}
                    </div>
                    {suggestion.description_es ? (
                      <p className="text-white/60 text-sm">{String(suggestion.description_es)}</p>
                    ) : null}
                    {suggestion.resolution_criteria_es ? (
                      <div className="text-white/40 text-xs">
                        <span className="font-medium text-white/50">Resolución:</span>{' '}
                        {String(suggestion.resolution_criteria_es)}
                      </div>
                    ) : null}
                    {suggestion.resolution_date ? (
                      <div className="text-white/40 text-xs">
                        <span className="font-medium text-white/50">Fecha:</span>{' '}
                        {String(suggestion.resolution_date)}
                      </div>
                    ) : null}
                    {Array.isArray(suggestion.tags) && suggestion.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(suggestion.tags as string[]).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {suggestion.reasoning ? (
                      <p className="text-white/50 text-xs italic">{String(suggestion.reasoning)}</p>
                    ) : null}
                    {Array.isArray(suggestion.source_signals) && suggestion.source_signals.length > 0 && (
                      <div className="text-white/30 text-xs">
                        Fuentes: {(suggestion.source_signals as string[]).join(', ')}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Link
                        href={createUrl}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                      >
                        💡 Create Market
                      </Link>
                      <button
                        onClick={() => dismissSuggestion(item.id)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-sm hover:text-white/60 hover:border-white/20 transition-colors"
                      >
                        Dismiss
                      </button>
                      {!item.archived_at && (
                        <button
                          type="button"
                          onClick={() => archiveAgentItem(item.id)}
                          className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1.5"
                        >
                          📦 Archive
                        </button>
                      )}
                    </div>
                  </div>
                )
              }

              if (type === 'inbox_digest') {
                let items: unknown[] = []
                try {
                  items = JSON.parse(item.body) as unknown[]
                } catch {
                  items = []
                }
                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-sm">{formatDate(item.created_at)}</span>
                      <Link
                        href="/predictions/admin/inbox"
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" /> Review Inbox
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {items.slice(0, 5).map((entry, i) => {
                        const e = entry as Record<string, unknown>
                        return (
                          <div
                            key={i}
                            className="flex justify-between items-start py-2 border-b border-slate-700 last:border-0"
                          >
                            <span className="text-white">{String(e.title ?? e.id ?? '—')}</span>
                            <span className="text-amber-400 text-sm">
                              {String(e.relevance_score ?? '—')}/10 •{' '}
                              {String(e.recommendation ?? '—')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }

              if (item.content_type === 'news_summary' && type === 'structured_news_brief') {
                return (
                  <StructuredNewsBriefCard
                    key={item.id}
                    item={item}
                    onArchive={() => archiveAgentItem(item.id)}
                  />
                )
              }

              if (type === 'news_brief' || item.content_type === 'news_summary') {
                return (
                  <div
                    key={item.id}
                    className="border border-white/10 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-medium text-sm">
                        {item.title}
                      </h4>
                      <span className="text-white/40 text-xs">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                      {item.body}
                    </p>
                    {item.market_id && (
                      <Link
                        href={`/predictions/markets/${item.market_id}`}
                        className="text-emerald-400 text-xs hover:underline"
                      >
                        Ver mercado →
                      </Link>
                    )}
                    {!item.archived_at && (
                      <div>
                        <button
                          type="button"
                          onClick={() => archiveAgentItem(item.id)}
                          className="text-gray-500 hover:text-gray-300 text-xs"
                        >
                          📦 Archive
                        </button>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div
                  key={item.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                >
                  <div className="font-medium text-white">{item.title}</div>
                  <pre className="text-sm text-slate-400 mt-2 whitespace-pre-wrap font-sans">
                    {item.body.slice(0, 500)}
                    {item.body.length > 500 ? '...' : ''}
                  </pre>
                  {!item.archived_at && (
                    <button
                      type="button"
                      onClick={() => archiveAgentItem(item.id)}
                      className="mt-2 text-gray-500 hover:text-gray-300 text-xs"
                    >
                      📦 Archive
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* SECTION 3: RUN HISTORY */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Run History</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 text-left">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {(data?.agentRuns ?? []).map((run) => (
                <tr
                  key={run.id}
                  className={`border-t border-slate-700 ${
                    run.status === 'success'
                      ? 'bg-emerald-500/5'
                      : run.status === 'error'
                        ? 'bg-red-500/5'
                        : 'bg-amber-500/5'
                  }`}
                >
                  <td className="px-4 py-3 text-slate-300">{formatDate(run.created_at)}</td>
                  <td className="px-4 py-3 text-white">{run.agent_name}</td>
                  <td className="px-4 py-3">
                    {run.status === 'success' ? (
                      <span className="text-emerald-400">success</span>
                    ) : run.status === 'error' ? (
                      <span className="text-red-400">error</span>
                    ) : (
                      <span className="text-amber-400">skipped</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{run.duration_ms}ms</td>
                  <td className="px-4 py-3 text-slate-400">
                    {run.tokens_input + run.tokens_output}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    ${Number(run.cost_estimate ?? 0).toFixed(6)}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {run.status === 'error' && run.error_message ? (
                      <span
                        title={run.error_message}
                        className="block text-red-400 text-xs truncate cursor-help"
                        style={{ maxWidth: 200 }}
                      >
                        {run.error_message.split('|')[0]?.trim() ?? run.error_message}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
