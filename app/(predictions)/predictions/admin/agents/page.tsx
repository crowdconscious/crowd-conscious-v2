'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ArchiveRestore,
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
  Mail,
  Target,
} from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import ShareBundle from '@/components/admin/ShareBundle'

/**
 * `scheduled: false` = no Vercel cron, "Run Now" is the only way the agent
 * executes. Kept in the list so admins can still trigger them on demand.
 */
const AGENTS = [
  { id: 'ceo-digest', label: 'CEO Digest', icon: FileText, scheduled: true },
  { id: 'news-monitor', label: 'News Monitor', icon: Newspaper, scheduled: true },
  { id: 'content-creator', label: 'Content Creator', icon: Bot, scheduled: false },
  { id: 'inbox-curator', label: 'Inbox Curator', icon: Inbox, scheduled: false },
  { id: 'sponsor-report', label: 'Sponsor Report', icon: Target, scheduled: true },
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
  onRestore,
}: {
  item: AgentContent
  onArchive: () => void
  onRestore: () => void
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
      {(data.signals ?? []).map((signal, i) => {
        const marketPrefill = signal.suggested_question
          ? `/predictions/admin/create-market?${new URLSearchParams({
              title: signal.suggested_question,
              ...(signal.category ? { category: signal.category } : {}),
              ...(signal.market_angle ? { description: signal.market_angle } : {}),
              ...(signal.headline ? { resolution_criteria: `Se resuelve según: ${signal.headline}` } : {}),
            }).toString()}`
          : null
        return (
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
            {marketPrefill && (
              <div className="mt-2">
                <Link
                  href={marketPrefill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
                >
                  + Crear mercado desde esta señal
                </Link>
              </div>
            )}
          </div>
        )
      })}
      <ArchiveToggleButton archived={!!item.archived_at} onArchive={onArchive} onRestore={onRestore} />
    </div>
  )
}

function ArchiveToggleButton({
  archived,
  onArchive,
  onRestore,
}: {
  archived: boolean
  onArchive: () => void
  onRestore: () => void
}) {
  if (archived) {
    return (
      <button
        type="button"
        onClick={onRestore}
        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs"
      >
        <ArchiveRestore className="w-3.5 h-3.5" /> Restore
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onArchive}
      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs"
    >
      <Archive className="w-3.5 h-3.5" /> Archive
    </button>
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
  if (
    digestType === 'ceo_digest' ||
    digestType === 'sponsor_outreach' ||
    item.content_type === 'sponsor_outreach' ||
    (item.content_type === 'weekly_digest' && type === 'ceo_digest')
  )
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
    generated_by: string | null
    pulse_market_id: string | null
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
  const [newsletterBusy, setNewsletterBusy] = useState<'idle' | 'send' | 'force'>('idle')
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [caseStudyOnly, setCaseStudyOnly] = useState(false)

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

  const sendNewsletterNow = async (force: boolean) => {
    setNewsletterBusy(force ? 'force' : 'send')
    setRunResult(null)
    setError('')
    try {
      const res = await fetch('/api/predictions/admin/send-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const json = (await res.json()) as {
        error?: string
        skipped?: boolean
        reason?: string
        sent?: number
        failed?: number
        subject?: string
        debug?: { recipientCount?: number }
      }
      if (!res.ok) {
        throw new Error(json.error ?? `Newsletter failed (${res.status})`)
      }
      if (json.skipped) {
        setRunResult(
          `Newsletter skipped: ${json.reason ?? 'unknown'}${json.debug?.recipientCount != null ? ` · recipients considered: ${json.debug.recipientCount}` : ''}`
        )
      } else {
        const parts = [
          `Sent ${json.sent ?? 0}`,
          json.failed ? `failed ${json.failed}` : null,
          json.subject ? `«${json.subject}»` : null,
        ].filter(Boolean)
        setRunResult(`Newsletter: ${parts.join(' · ')}`)
      }
      setTimeout(() => setRunResult(null), 12000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Newsletter failed')
    } finally {
      setNewsletterBusy('idle')
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

  const archiveAgentItem = async (id: string, restore = false) => {
    try {
      const res = await fetch('/api/predictions/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'agent_content', id, restore }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || (restore ? 'Restore failed' : 'Archive failed'))
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed')
    }
  }

  /**
   * Tab → `content_type` value used for sweep narrowing. `null` means
   * the sweep runs across the whole `agent_content` table (used by
   * the "All" tab and the per-resource catch-all).
   */
  const sweepContentTypeFor = (tab: TabId): string | null => {
    if (tab === 'ceo') return 'weekly_digest'
    if (tab === 'news') return 'news_summary'
    if (tab === 'suggestions') return 'market_suggestion'
    return null
  }

  const [sweepDays, setSweepDays] = useState(30)
  const [sweepBusy, setSweepBusy] = useState(false)

  const runSweep = async () => {
    if (sweepBusy) return
    const contentType = sweepContentTypeFor(activeTab)
    const label = contentType ?? 'all agent content'
    if (
      !window.confirm(
        `Archive ${label} older than ${sweepDays} days? This is reversible per-row from the archived view.`
      )
    ) {
      return
    }
    setSweepBusy(true)
    try {
      const res = await fetch('/api/predictions/admin/archive-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'agent_content',
          days: sweepDays,
          contentType,
        }),
      })
      const json = (await res.json()) as { count?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Sweep failed')
      window.alert(
        (json.count ?? 0) > 0 ? `Archived ${json.count} item(s).` : 'Nothing to archive.'
      )
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sweep failed')
    } finally {
      setSweepBusy(false)
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
  const draftBlogCount = blogPosts.filter((bp) => bp.status === 'draft').length

  // Soft monthly budget for LLM spend. Adjust MONTHLY_BUDGET_USD as the
  // platform grows — surfacing this keeps agent costs from drifting silently.
  const MONTHLY_BUDGET_USD = 10
  const budgetUsed = stats.totalCost / MONTHLY_BUDGET_USD
  const budgetColor =
    budgetUsed >= 1
      ? 'text-red-400'
      : budgetUsed >= 0.75
        ? 'text-amber-400'
        : 'text-emerald-400'

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
          {AGENTS.map(({ id, label, icon: Icon, scheduled }) => {
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
                    {!scheduled && (
                      <span
                        className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        title="No automatic schedule — runs only via Run Now"
                      >
                        Manual
                      </span>
                    )}
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
        <div className="mt-4 flex flex-wrap gap-6 p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <div>
            <span className="text-slate-400">Total cost this month:</span>{' '}
            <span className={`${budgetColor} font-medium`}>
              ${stats.totalCost.toFixed(4)}
            </span>{' '}
            <span className="text-slate-500 text-sm">
              / ${MONTHLY_BUDGET_USD.toFixed(2)} budget ({Math.round(budgetUsed * 100)}%)
            </span>
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
        <div className="mt-2 text-xs text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-medium">Schedules (CDMX):</span>{' '}
          News Monitor lunes 08:00 · CEO Digest lunes 10:00 · Newsletter L/M/V 08:00 · Sponsor Report mensual día 1, 03:00.
          {' '}Content Creator e Inbox Curator son <span className="text-amber-300">manuales</span> — usa «Run Now».
          Fuente: <code className="text-slate-400">vercel.json</code>.
        </div>
      </section>

      {/* Crowd newsletter (same pipeline as cron /api/cron/newsletter) */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-2">Crowd newsletter</h2>
        <p className="text-slate-400 text-sm mb-4 max-w-2xl">
          Sends the blog + Pulse + markets digest to opted-in profiles and newsletter subscribers.
          Respects the same rules as the scheduled job (36h cooldown unless a new blog is featured or you
          force send).
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void sendNewsletterNow(false)}
            disabled={newsletterBusy !== 'idle'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors"
          >
            <Mail className="w-4 h-4" />
            {newsletterBusy === 'send' ? 'Sending…' : 'Send newsletter now'}
          </button>
          <button
            type="button"
            onClick={() => void sendNewsletterNow(true)}
            disabled={newsletterBusy !== 'idle'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 border border-slate-600 disabled:opacity-50 text-white transition-colors"
          >
            {newsletterBusy === 'force' ? 'Sending…' : 'Send now (ignore cooldown)'}
          </button>
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

        {/* Maintenance sweep — keeps the dashboard tidy as agents accumulate output. */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Archive className="w-3.5 h-3.5" />
            Maintenance
          </span>
          <span className="text-xs text-slate-400">Archive</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
            {sweepContentTypeFor(activeTab) ?? 'all content types'}
          </span>
          <span className="text-xs text-slate-400">older than</span>
          <input
            type="number"
            min={0}
            max={3650}
            step={1}
            value={sweepDays}
            onChange={(e) =>
              setSweepDays(Math.max(0, Math.min(3650, Number(e.target.value) || 0)))
            }
            className="h-8 w-16 rounded border border-slate-700 bg-slate-900 px-2 text-center text-sm text-white focus:border-amber-400/40 focus:outline-none"
          />
          <span className="text-xs text-slate-400">days</span>
          <button
            type="button"
            onClick={runSweep}
            disabled={sweepBusy}
            className="ml-auto inline-flex min-h-[32px] items-center gap-1.5 rounded-md bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition hover:bg-amber-500/25 disabled:opacity-50"
          >
            {sweepBusy ? '…' : 'Run sweep'}
          </button>
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
        {/* Tabs ordered by priority — items that need ACTION first, */}
        {/* passive reads (News, CEO) last. Badge = count needing action. */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {([
            { id: 'suggestions' as TabId, label: 'Market Suggestions', badge: pendingSuggestions, priority: true },
            { id: 'blog' as TabId, label: 'Blog Posts', badge: draftBlogCount, priority: true },
            { id: 'news' as TabId, label: 'News Briefs', badge: 0 },
            { id: 'inbox' as TabId, label: 'Inbox Digests', badge: 0 },
            { id: 'ceo' as TabId, label: 'CEO Digests', badge: 0 },
            { id: 'all' as TabId, label: 'All', badge: 0 },
          ]).map(({ id, label, badge, priority }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{label}</span>
              {badge > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    priority
                      ? activeTab === id
                        ? 'bg-white text-emerald-700'
                        : 'bg-amber-500 text-slate-900'
                      : activeTab === id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {activeTab === 'blog' ? (
            (() => {
              const visiblePosts = caseStudyOnly
                ? blogPosts.filter(
                    (bp) => bp.generated_by === 'case-study-draft' && bp.status === 'draft'
                  )
                : blogPosts
              const caseDraftCount = blogPosts.filter(
                (bp) => bp.generated_by === 'case-study-draft' && bp.status === 'draft'
              ).length

              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCaseStudyOnly((v) => !v)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
                        caseStudyOnly
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      Borradores de caso de estudio
                      <span
                        className={`px-1.5 rounded text-[10px] ${
                          caseStudyOnly ? 'bg-amber-500/30' : 'bg-slate-700'
                        }`}
                      >
                        {caseDraftCount}
                      </span>
                    </button>
                    {caseStudyOnly && (
                      <span className="text-[11px] text-slate-500">
                        Auto-generados al cerrar un Pulse con ≥10 votos.
                      </span>
                    )}
                  </div>

                  {visiblePosts.length === 0 ? (
                    <div className="text-slate-500 py-8 text-center">
                      {caseStudyOnly
                        ? 'No hay borradores de caso de estudio. Esperando próximo cierre de Pulse.'
                        : 'No blog drafts yet. Run Content Creator.'}
                    </div>
                  ) : (
                    visiblePosts.map((bp) => {
                      const isCaseStudy = bp.generated_by === 'case-study-draft'
                      return (
                        <div
                          key={bp.id}
                          className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="mb-4 max-w-md">
                                <span className="text-gray-300 text-sm font-medium block mb-2">
                                  Cover image
                                </span>
                                <ImageUpload
                                  currentUrl={bp.cover_image_url?.trim() || null}
                                  onUpload={(url) => void saveBlogCover(bp.id, url)}
                                  storagePath="blog"
                                  label="Upload cover"
                                  hint="PNG, JPG, WebP · max 2MB"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-xs uppercase text-emerald-400/90">
                                  {bp.category}
                                </span>
                                {isCaseStudy && (
                                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Caso de estudio
                                  </span>
                                )}
                              </div>
                              <h3 className="text-white font-semibold text-lg">{bp.title}</h3>
                              <p className="text-slate-400 text-sm mt-1 line-clamp-3">
                                {bp.excerpt}
                              </p>
                              <p className="text-slate-500 text-xs mt-2">
                                {formatDate(bp.created_at)} · status:{' '}
                                <span className="text-slate-300">{bp.status}</span>
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/predictions/admin/blog/edit/${bp.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-700/40 rounded text-emerald-200 font-medium"
                              >
                                Edit
                              </Link>
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

                          {bp.status === 'published' && (
                            <ShareBundle
                              slug={bp.slug}
                              title={bp.title}
                              pulseMarketId={bp.pulse_market_id}
                              coverImageUrl={bp.cover_image_url}
                            />
                          )}
                        </div>
                      )
                    })
                  )}
                </>
              )
            })()
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
                      <ArchiveToggleButton
                        archived={!!item.archived_at}
                        onArchive={() => archiveAgentItem(item.id)}
                        onRestore={() => archiveAgentItem(item.id, true)}
                      />
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
                    onRestore={() => archiveAgentItem(item.id, true)}
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
                    <div>
                      <ArchiveToggleButton
                        archived={!!item.archived_at}
                        onArchive={() => archiveAgentItem(item.id)}
                        onRestore={() => archiveAgentItem(item.id, true)}
                      />
                    </div>
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
                  <div className="mt-2">
                    <ArchiveToggleButton
                      archived={!!item.archived_at}
                      onArchive={() => archiveAgentItem(item.id)}
                      onRestore={() => archiveAgentItem(item.id, true)}
                    />
                  </div>
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
