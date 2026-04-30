'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bot, ExternalLink, Play, Sparkles } from 'lucide-react'

/**
 * Inline runner card for Content Creator v4.
 *
 * v4 needs a concrete seed: either a free-text topic (from the founder, a news
 * tip, a Pulse opportunity title) or a marketId for an active Pulse. The card
 * surfaces a short text input + optional marketId so the founder can fire
 * the agent without leaving the dashboard.
 *
 * "Generar contenido" buttons elsewhere (News Monitor opportunities) call the
 * same /run-agent endpoint with a pre-filled topic; this card is the manual
 * fallback.
 */

type RunResult = {
  success: boolean
  error?: string
  blog_post_id?: string
  agent_content_id?: string
  package?: { blog_es?: { title?: string }; self_score?: number; hook_score?: number }
}

export default function ContentCreatorRunner({
  parentBusy,
  onAfterRun,
  lastRunMeta,
}: {
  parentBusy: boolean
  onAfterRun: () => Promise<void> | void
  lastRunMeta: {
    lastRunAt: string | null
    status: string | null
    tokensTotal: number
    cost: number
    error: string | null
  }
}) {
  const [topic, setTopic] = useState('')
  const [marketId, setMarketId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (busy || parentBusy) return
    if (!topic.trim() && !marketId.trim()) {
      setError('Pásame un tópico o un marketId.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const body: Record<string, unknown> = {
        agent: 'content-creator',
        source: 'admin_dashboard',
      }
      if (topic.trim()) body.topic = topic.trim()
      if (marketId.trim()) body.marketId = marketId.trim()

      const res = await fetch('/api/predictions/admin/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        result?: RunResult
      }
      if (!res.ok) {
        throw new Error(json.error ?? `Run failed (${res.status})`)
      }
      setResult(json.result ?? { success: true })
      await onAfterRun()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setBusy(false)
    }
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-slate-400" />
          <span className="font-medium text-white">Content Creator v4</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Manual
          </span>
        </div>
      </div>

      {lastRunMeta.lastRunAt ? (
        <div className="text-xs text-slate-500 space-y-0.5">
          <div>Last run: {formatTime(lastRunMeta.lastRunAt)} ({lastRunMeta.status})</div>
          <div>
            Tokens: {lastRunMeta.tokensTotal.toLocaleString()} · Cost: $
            {lastRunMeta.cost.toFixed(4)}
          </div>
          {lastRunMeta.error && (
            <div className="text-red-400 truncate" title={lastRunMeta.error}>
              Error: {lastRunMeta.error.slice(0, 60)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-slate-500">No runs yet</div>
      )}

      <div className="space-y-2 pt-1">
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Tópico (free text)
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="ej. ¿Cuántos goles meterá México en fase de grupos?"
          disabled={busy}
          className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none disabled:opacity-60"
        />
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
            …o pasa un marketId existente
          </summary>
          <input
            type="text"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            placeholder="UUID del mercado/Pulse"
            disabled={busy}
            className="mt-2 w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-white text-xs font-mono placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none disabled:opacity-60"
          />
        </details>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      )}

      {result?.success && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 space-y-1.5">
          <div className="font-medium">
            <Sparkles className="inline w-3 h-3" /> Paquete v4 generado
          </div>
          {result.package?.blog_es?.title && (
            <div className="text-emerald-200">«{result.package.blog_es.title}»</div>
          )}
          {(typeof result.package?.self_score === 'number' ||
            typeof result.package?.hook_score === 'number') && (
            <div className="text-[10px] text-emerald-400/80">
              {typeof result.package?.hook_score === 'number' && (
                <span>Hook {result.package.hook_score}/10</span>
              )}
              {typeof result.package?.self_score === 'number' && (
                <span> · Self {result.package.self_score}/10</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {result.agent_content_id && (
              <Link
                href={`/predictions/admin/agents/v4-package/${result.agent_content_id}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-medium"
              >
                <ExternalLink className="w-3 h-3" /> Ver paquete
              </Link>
            )}
            {result.blog_post_id && (
              <Link
                href={`/predictions/admin/blog/edit/${result.blog_post_id}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium"
              >
                Editar blog
              </Link>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={run}
        disabled={busy || parentBusy || (!topic.trim() && !marketId.trim())}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
      >
        <Play className="w-4 h-4" />
        {busy ? 'Generando paquete v4…' : 'Generar contenido'}
      </button>
    </div>
  )
}
