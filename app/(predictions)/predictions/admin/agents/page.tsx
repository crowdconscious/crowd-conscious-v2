'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Minus,
  Play,
  Copy,
  ExternalLink,
  Bot,
  FileText,
  Newspaper,
  Inbox,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Calendar,
} from 'lucide-react'

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

type TabId = 'all' | 'ceo' | 'social' | 'news' | 'inbox' | 'suggestions' | 'calendar' | 'blog'

function formatDate(t: string) {
  return new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** YYYY-MM-DD in the browser's local calendar (avoids UTC day shifts from toISOString). */
function dateKeyLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getSocialPostScheduledDateKey(post: AgentContent): string {
  const meta = post.metadata as { scheduled_date?: string } | undefined
  if (meta?.scheduled_date && /^\d{4}-\d{2}-\d{2}$/.test(String(meta.scheduled_date))) {
    return String(meta.scheduled_date).slice(0, 10)
  }
  try {
    const p = JSON.parse(post.body) as { scheduled_date?: string }
    if (p.scheduled_date && /^\d{4}-\d{2}-\d{2}$/.test(String(p.scheduled_date))) {
      return String(p.scheduled_date).slice(0, 10)
    }
  } catch {
    // ignore
  }
  return dateKeyLocal(new Date(post.created_at))
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

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-left text-sm text-slate-300 hover:bg-slate-800"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {title}
      </button>
      {open && <div className="px-3 py-2 text-sm text-slate-400 border-t border-slate-700">{children}</div>}
    </div>
  )
}

function SocialPostCard({
  item,
  copyToClipboard,
  updateContentStatus,
  formatDate,
}: {
  item: AgentContent
  copyToClipboard: (t: string) => void
  updateContentStatus: (id: string, u: { published?: boolean; metadata?: Record<string, unknown> }) => Promise<void>
  formatDate: (t: string) => string
}) {
  const meta = item.metadata ?? {}
  let post: Record<string, unknown> = {}
  try {
    post = JSON.parse(item.body) as Record<string, unknown>
  } catch {
    post = { body: item.body }
  }
  const body = String(post.body ?? '')
  const hashtags = Array.isArray(post.hashtags)
    ? (post.hashtags as string[]).join(' ')
    : String(post.hashtags ?? '')
  const copyText = body + (hashtags ? `\n\n${hashtags}` : '')
  const statusOrder = ['draft', 'approved', 'posted'] as const
  const currentStatus = (meta.status as string) ?? (item.published ? 'approved' : 'draft')
  const nextStatus =
    statusOrder[(statusOrder.indexOf(currentStatus as typeof statusOrder[number]) + 1) % 3]
  const platform = String(meta.platform ?? post.platform ?? 'social').toLowerCase()
  const imagePrompt = String(post.image_prompt ?? meta.image_prompt ?? '')
  const carouselIdea = String(post.carousel_idea ?? meta.carousel_idea ?? '')
  const memeSuggestion = String(post.meme_suggestion ?? meta.meme_suggestion ?? '')
  const threadOption = String(post.thread_option ?? meta.thread_option ?? '')
  const quoteTweetHook = String(post.quote_tweet_hook ?? meta.quote_tweet_hook ?? '')
  const hookVariations = Array.isArray(post.hook_variations)
    ? (post.hook_variations as string[])
    : Array.isArray(meta.hook_variations)
      ? (meta.hook_variations as string[])
      : []

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-amber-400 text-sm">
          {platform} • {String(post.language ?? 'es')}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(copyText)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
          <button
            onClick={() =>
              updateContentStatus(item.id, {
                metadata: { ...meta, status: nextStatus },
                published: nextStatus === 'posted' || nextStatus === 'approved',
              })
            }
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            {currentStatus} → {nextStatus}
          </button>
        </div>
      </div>
      <div className="text-white font-medium">{String(post.hook ?? item.title)}</div>
      <pre className="text-sm text-slate-400 whitespace-pre-wrap font-sans">{body}</pre>
      {hashtags && <div className="text-sm text-emerald-400">{hashtags}</div>}
      {(imagePrompt || carouselIdea || memeSuggestion) && (
        <div className="space-y-2 mt-3">
          {imagePrompt && (
            <CollapsibleSection title="Image Prompt (Leonardo AI / Midjourney)">
              <div className="flex justify-between gap-2">
                <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs flex-1">{imagePrompt}</pre>
                <button
                  onClick={() => copyToClipboard(imagePrompt)}
                  className="shrink-0 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </CollapsibleSection>
          )}
          {carouselIdea && (
            <CollapsibleSection title="Carousel Idea">
              <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs">{carouselIdea}</pre>
            </CollapsibleSection>
          )}
          {memeSuggestion && (
            <CollapsibleSection title="Meme Suggestion">
              <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs">{memeSuggestion}</pre>
            </CollapsibleSection>
          )}
        </div>
      )}
      {(threadOption || quoteTweetHook) && (
        <div className="space-y-2 mt-3">
          {threadOption && (
            <CollapsibleSection title="Thread Option (3 tweets)">
              <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs">{threadOption}</pre>
            </CollapsibleSection>
          )}
          {quoteTweetHook && (
            <CollapsibleSection title="Quote Tweet Hook">
              <pre className="text-slate-300 whitespace-pre-wrap font-sans text-xs">{quoteTweetHook}</pre>
            </CollapsibleSection>
          )}
        </div>
      )}
      {hookVariations.length > 0 && (
        <CollapsibleSection title="Hook Variations (3 alternatives)">
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            {hookVariations.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  )
}

function ContentCalendarView({
  posts,
  copyToClipboard,
  updateContentStatus,
  formatDate,
}: {
  posts: AgentContent[]
  copyToClipboard: (t: string) => void
  updateContentStatus: (id: string, u: { published?: boolean; metadata?: Record<string, unknown> }) => Promise<void>
  formatDate: (t: string) => string
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7)
  startOfWeek.setHours(0, 0, 0, 0)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    days.push(d)
  }

  const postsByDate = new Map<string, AgentContent[]>()
  for (const post of posts) {
    const key = getSocialPostScheduledDateKey(post)
    if (!postsByDate.has(key)) postsByDate.set(key, [])
    postsByDate.get(key)!.push(post)
  }

  const getPlatformColor = (platform: string) => {
    const p = platform.toLowerCase()
    if (p.includes('instagram')) return 'bg-emerald-500/30 border-emerald-500/50'
    if (p.includes('twitter') || p.includes('x')) return 'bg-blue-500/30 border-blue-500/50'
    if (p.includes('linkedin')) return 'bg-purple-500/30 border-purple-500/50'
    return 'bg-slate-500/30 border-slate-500/50'
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const getDayName = (d: Date) => dayNames[(d.getDay() + 6) % 7]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="text-slate-300">Week of {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          >
            Next →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = dateKeyLocal(day)
          const dayPosts = postsByDate.get(key) ?? []
          return (
            <div
              key={key}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 min-h-[120px]"
            >
              <div className="text-xs text-slate-500 mb-2">
                {getDayName(day)} {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayPosts.map((post) => {
                  let p: Record<string, unknown> = {}
                  try {
                    p = JSON.parse(post.body) as Record<string, unknown>
                  } catch {
                    p = {}
                  }
                  const platform = String(post.metadata?.platform ?? p.platform ?? 'social')
                  const isExpanded = expandedId === post.id
                  return (
                    <div key={post.id} className="space-y-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : post.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs border truncate ${getPlatformColor(platform)} text-white hover:opacity-90`}
                      >
                        {String(p.hook ?? post.title).slice(0, 40)}…
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-2 bg-slate-900/80 rounded border border-slate-700 text-xs space-y-2">
                          <pre className="text-slate-300 whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">
                            {String(p.body ?? '')}
                          </pre>
                          {String(p.image_prompt ?? '').slice(0, 80) && (
                            <div className="text-slate-500 truncate" title={String(p.image_prompt)}>
                              🖼 {String(p.image_prompt).slice(0, 60)}…
                            </div>
                          )}
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const tags = Array.isArray(p.hashtags) ? (p.hashtags as string[]).join(' ') : String(p.hashtags ?? '')
                                copyToClipboard(String(p.body ?? '') + (tags ? `\n\n${tags}` : ''))
                              }}
                              className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() =>
                                updateContentStatus(post.id, {
                                  metadata: { ...post.metadata, status: 'posted' },
                                  published: true,
                                })
                              }
                              className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium"
                            >
                              Mark as Posted
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/50" /> Instagram</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/50" /> Twitter</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500/50" /> LinkedIn</span>
      </div>
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
  if (type === 'news_brief' || type === 'news_relevance' || item.content_type === 'news_summary')
    return 'news'
  if (item.content_type === 'social_post' || (meta.platform as string)) return 'social'
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

  const updateContentStatus = async (
    id: string,
    updates: { published?: boolean; metadata?: Record<string, unknown> }
  ) => {
    try {
      const res = await fetch(`/api/predictions/admin/agent-content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Update failed')
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
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

  const content = (data?.agentContent ?? []).filter((c) => c.content_type !== 'blog_post')
  const blogPosts = data?.blogPosts ?? []
  const socialPosts = content.filter((c) => c.content_type === 'social_post' || (c.metadata?.platform as string))
  const filteredContent =
    activeTab === 'calendar' || activeTab === 'blog'
      ? []
      : activeTab === 'all'
        ? content
        : content.filter((c) => {
            const tab = getContentTab(c)
            if (activeTab === 'ceo') return tab === 'ceo'
            if (activeTab === 'social') return tab === 'social'
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
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: 'all' as TabId, label: 'All' },
            { id: 'ceo' as TabId, label: 'CEO Digests' },
            { id: 'social' as TabId, label: 'Social Posts' },
            { id: 'news' as TabId, label: 'News Briefs' },
            { id: 'inbox' as TabId, label: 'Inbox Digests' },
            { id: 'suggestions' as TabId, label: 'Market Suggestions' },
            { id: 'calendar' as TabId, label: 'Content Calendar' },
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
                    <div>
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
          ) : activeTab === 'calendar' ? (
            <ContentCalendarView
              posts={socialPosts}
              copyToClipboard={copyToClipboard}
              updateContentStatus={updateContentStatus}
              formatDate={formatDate}
            />
          ) : filteredContent.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">No content in this category</div>
          ) : (
            filteredContent.map((item) => {
              const meta = item.metadata ?? {}
              const type = meta.type as string

              if (item.content_type === 'social_post' || meta.platform) {
                return (
                  <SocialPostCard
                    key={item.id}
                    item={item}
                    copyToClipboard={copyToClipboard}
                    updateContentStatus={updateContentStatus}
                    formatDate={formatDate}
                  />
                )
              }

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
