'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import type { Database } from '@/types/database'

type AgentContent = Database['public']['Tables']['agent_content']['Row']

interface Props {
  initialItems: AgentContent[]
  totalCount: number
}

export function InsightsClient({ initialItems, totalCount }: Props) {
  const [items, setItems] = useState<AgentContent[]>(initialItems)
  const [loading, setLoading] = useState(false)

  const hasMore = items.length < totalCount

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/predictions/agent-content?offset=${items.length}&limit=20`)
      if (!res.ok) return
      const data = await res.json()
      const next = (data.items ?? []) as AgentContent[]
      setItems((prev) => [...prev, ...next])
    } catch (e) {
      console.error('Load more insights:', e)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center">
        <Bot className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-400">Coming soon</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((ac) => (
          <div key={ac.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{ac.title}</p>
                <p className="text-slate-400 text-sm mt-2 line-clamp-4">{ac.body}</p>
                <p className="text-slate-500 text-xs mt-3">
                  {new Date(ac.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
