'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Flame, FileText, Lightbulb } from 'lucide-react'

export type AttentionItem = {
  id: string
  kind: 'resolved_market' | 'streak' | 'blog_drafts' | 'market_suggestions' | 'fund_cycle'
  title: string
  href: string
  cta: string
  emphasis?: 'urgent' | 'normal'
}

interface Props {
  items: AttentionItem[]
  emptyMessage?: string
  emptyHref?: string
  emptyCta?: string
}

function iconFor(kind: AttentionItem['kind']) {
  switch (kind) {
    case 'resolved_market':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
    case 'streak':
      return <Flame className="h-4 w-4 text-amber-400" aria-hidden />
    case 'blog_drafts':
      return <FileText className="h-4 w-4 text-blue-400" aria-hidden />
    case 'market_suggestions':
      return <Lightbulb className="h-4 w-4 text-fuchsia-400" aria-hidden />
    case 'fund_cycle':
      return <Flame className="h-4 w-4 text-emerald-400" aria-hidden />
  }
}

/**
 * Compact "what needs your attention" feed. Replaces the old
 * QuickActions navigation-disguised-as-content block. Shows at most
 * four items; caller has already prioritized them.
 */
export function AttentionFeed({ items, emptyMessage, emptyHref, emptyCta }: Props) {
  const shown = items.slice(0, 4)

  if (shown.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Needs your attention
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-sm text-slate-300">
            {emptyMessage ?? 'Todo al día. Nada urgente por ahora.'}
          </p>
          {emptyHref && emptyCta ? (
            <Link
              href={emptyHref}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              {emptyCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Needs your attention
      </p>
      <ul className="space-y-2">
        {shown.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                item.emphasis === 'urgent'
                  ? 'border-amber-500/30 bg-amber-500/[0.06] hover:border-amber-500/50'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                  {iconFor(item.kind)}
                </span>
                <span className="min-w-0 truncate text-sm text-slate-200">{item.title}</span>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-400 transition-colors group-hover:text-emerald-300">
                {item.cta}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
