'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
}

type TabId = 'all' | 'ceo' | 'social' | 'news' | 'inbox' | 'suggestions'

function formatDate(t: string) {
  return new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getContentTab(item: AgentContent): TabId | null {
  const meta = item.metadata ?? {}
  const type = meta.type as string
  const digestType = meta.digest_type as string
  if (type === 'inbox_digest') return 'inbox'
  if (type === 'market_suggestion' || item.content_type === 'market_insight') return 'suggestions'
  if (type === 'news_brief' || type === 'news_relevance' || item.content_type === 'news_summary')
    return 'news'
  if (item.content_type === 'social_post' || (meta.platform as string)) return 'social'
  if (digestType === 'ceo_digest' || (item.content_type === 'weekly_digest' && type === 'ceo_digest'))
    return 'ceo'
  return 'all'
}

export default function AdminAgentsPage() {
  const [data, setData] = useState<{
    agentRuns: AgentRun[]
    lastRunsByAgent: Record<string, AgentRun>
    monthlyStats: { totalCost: number; totalRuns: number; totalErrors: number }
    agentContent: AgentContent[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/admin/agents')
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
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const runAgent = async (agentId: string) => {
    setRunning(agentId)
    try {
      const res = await fetch('/api/predictions/admin/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  const content = data?.agentContent ?? []
  const filteredContent =
    activeTab === 'all'
      ? content
      : content.filter((c) => {
          const tab = getContentTab(c)
          if (activeTab === 'ceo') return tab === 'ceo'
          if (activeTab === 'social') return tab === 'social'
          if (activeTab === 'news') return tab === 'news'
          if (activeTab === 'inbox') return tab === 'inbox'
          if (activeTab === 'suggestions') return tab === 'suggestions'
          return true
        })

  const lastRuns = data?.lastRunsByAgent ?? {}
  const stats = data?.monthlyStats ?? { totalCost: 0, totalRuns: 0, totalErrors: 0 }

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
        <h2 className="text-lg font-semibold text-white mb-4">Recent Content</h2>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { id: 'all' as TabId, label: 'All' },
            { id: 'ceo' as TabId, label: 'CEO Digests' },
            { id: 'social' as TabId, label: 'Social Posts' },
            { id: 'news' as TabId, label: 'News Briefs' },
            { id: 'inbox' as TabId, label: 'Inbox Digests' },
            { id: 'suggestions' as TabId, label: 'Market Suggestions' },
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
          {filteredContent.length === 0 ? (
            <div className="text-slate-500 py-8 text-center">No content in this category</div>
          ) : (
            filteredContent.map((item) => {
              const meta = item.metadata ?? {}
              const type = meta.type as string

              if (item.content_type === 'social_post' || meta.platform) {
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

                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 text-sm">
                        {String(meta.platform ?? 'social')} • {String(post.language ?? 'es')}
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
                    <pre className="text-sm text-slate-400 whitespace-pre-wrap font-sans">
                      {body}
                    </pre>
                    {hashtags && (
                      <div className="text-sm text-emerald-400">{hashtags}</div>
                    )}
                  </div>
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

              if (type === 'market_suggestion' || item.content_type === 'market_insight') {
                let sug: Record<string, unknown> = {}
                try {
                  sug = JSON.parse(item.body) as Record<string, unknown>
                } catch {
                  sug = { title: item.title }
                }
                const title = String(sug.title ?? item.title)
                const category = String(sug.category ?? '')
                const resolutionCriteria = String(sug.resolution_criteria ?? '')
                const createUrl = `/predictions/admin/create-market?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&resolution_criteria=${encodeURIComponent(resolutionCriteria)}`

                return (
                  <div
                    key={item.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-medium text-white">{title}</div>
                      <div className="text-sm text-slate-400 mt-1">Category: {category}</div>
                      <div className="text-sm text-slate-500 mt-1">{resolutionCriteria}</div>
                    </div>
                    <Link
                      href={createUrl}
                      className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white shrink-0"
                    >
                      <Lightbulb className="w-4 h-4" /> Create Market
                    </Link>
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
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="text-slate-400 text-sm mb-2">{formatDate(item.created_at)}</div>
                    <pre className="text-white whitespace-pre-wrap font-sans text-sm">
                      {item.body}
                    </pre>
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
