import Link from 'next/link'
import { getLiveEventTitle } from '@/lib/live-event-title'
import type { Json } from '@/types/database'

type LiveRow = { id: string; title: string; translations: Json | null }

export function LiveEventBanner({
  liveRow,
  locale,
  voteCount,
}: {
  liveRow: LiveRow
  locale: 'es' | 'en'
  voteCount?: number
}) {
  const title = getLiveEventTitle(liveRow, locale)
  const votes = voteCount ?? 0

  return (
    <Link
      href={`/live/${liveRow.id}`}
      className="block w-full border-b border-red-500/20 bg-red-500/10 py-2.5 pl-4 pr-4 transition-colors hover:bg-red-500/15"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-red-400">
            {locale === 'es' ? 'En vivo' : 'Live'}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-white">{title}</span>
          {votes > 0 && (
            <span className="hidden shrink-0 text-sm text-gray-400 sm:inline">
              · {votes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')}{' '}
              {locale === 'es' ? 'predicciones' : 'predictions'}
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-emerald-400">
          {locale === 'es' ? 'Unirse →' : 'Join →'}
        </span>
      </div>
    </Link>
  )
}
