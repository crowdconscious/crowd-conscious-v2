'use client'

import { type CitizenSignalsLocale } from '@/lib/i18n/citizen-signals'

export type EvidenceItem = {
  id: string
  kind: string
  caption: string | null
  url: string | null
  created_at: string
}

export default function EvidenceGallery({
  locale,
  items,
}: {
  locale: CitizenSignalsLocale
  items: EvidenceItem[]
}) {
  if (items.length === 0) return null
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((ev) => (
        <li
          key={ev.id}
          className="overflow-hidden rounded-lg border border-[#2d3748] bg-[#11161f]"
        >
          {ev.url && ev.kind === 'image' && (
            // Signed URLs from a private bucket — using <img> avoids the
            // Next/Image config dance for arbitrary signed hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ev.url}
              alt={ev.caption ?? ''}
              className="aspect-video w-full object-cover"
              loading="lazy"
            />
          )}
          {ev.url && ev.kind === 'pdf' && (
            <a
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-video items-center justify-center bg-[#0f1419] text-sm font-medium text-emerald-300 hover:bg-[#13202b]"
            >
              {locale === 'es' ? 'Abrir PDF' : 'Open PDF'}
            </a>
          )}
          {ev.url && ev.kind === 'link' && (
            <a
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="block break-words p-4 text-sm text-emerald-300 hover:text-emerald-200"
            >
              {ev.url}
            </a>
          )}
          {ev.caption && (
            <p className="px-3 py-2 text-xs text-slate-400">{ev.caption}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
