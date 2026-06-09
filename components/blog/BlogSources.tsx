import { ExternalLink } from 'lucide-react'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'

export type BlogSource = { label?: string | null; url?: string | null }

type Props = {
  sources: unknown
  locale: CreatorLocale
}

/** Coerce the jsonb `sources` column into a clean list of {label,url}. */
export function parseBlogSources(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => {
      const item = s as BlogSource
      const url = typeof item?.url === 'string' ? item.url.trim() : ''
      const label = typeof item?.label === 'string' ? item.label.trim() : ''
      return { label: label || url, url }
    })
    .filter((s) => s.url.length > 0)
}

/**
 * Cited sources rendered at the FOOT of a blog post, styled like the Pulse
 * provenance / "Fuentes de verificación" block: a bordered section with a
 * small uppercase heading and a list of verifiable links.
 */
export function BlogSources({ sources, locale }: Props) {
  const t = getCreatorCopy(locale)
  const items = parseBlogSources(sources)
  if (items.length === 0) return null

  return (
    <section className="mt-12 rounded-xl border border-[#2d3748] bg-[#13181c]/60 p-5">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400/90">
        {t.sourcesTitle}
      </h2>
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="break-words text-slate-300 underline-offset-2 hover:text-emerald-300 hover:underline"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
