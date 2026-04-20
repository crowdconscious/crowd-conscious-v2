'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Heart } from 'lucide-react'

type PublicCause = {
  id: string
  slug: string
  name: string
  organization: string | null
  category: string | null
  short_description: string | null
  logo_url: string | null
  cover_image_url: string | null
  image_url: string | null
  city: string | null
  verified: boolean
}

/**
 * CausesCommunityRow — horizontal scroll of 3–4 verified causes for the
 * current locale, mounted on /locations below the NearestToAzteca block.
 * The idea: a user browsing Conscious Places is already invested in local
 * impact; surfacing the causes the same community votes on closes the
 * loop from "venue I like" to "cause I can support".
 *
 * Renders nothing if fewer than 3 verified causes exist — the row
 * is a social-proof signal and 2 logos reads as seed data.
 */
const MIN_CAUSES = 3

export function CausesCommunityRow({
  locale,
  city,
}: {
  locale: 'es' | 'en'
  city?: string
}) {
  const [causes, setCauses] = useState<PublicCause[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = new URL('/api/fund/causes/public', window.location.origin)
    if (city) url.searchParams.set('city', city)
    url.searchParams.set('limit', '6')
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : { causes: [] }))
      .then((d) => setCauses((d.causes ?? []) as PublicCause[]))
      .catch(() => setCauses([]))
      .finally(() => setLoading(false))
  }, [city])

  if (loading || !causes || causes.length < MIN_CAUSES) return null

  const L = (es: string, en: string) => (locale === 'es' ? es : en)

  return (
    <section className="mb-12 border-t border-[#2d3748] pt-10">
      <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {L('Causas que apoya la comunidad', 'Causes the community supports')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {L(
              'Vota en el próximo ciclo del Fondo Consciente.',
              'Vote in the next Conscious Fund cycle.'
            )}
          </p>
        </div>
        <Link
          href="/predictions/fund"
          className="text-sm text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
        >
          <Heart className="w-4 h-4" />
          {L('Ver todas', 'View all')}
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x pb-4 -mx-2 px-2">
        {causes.slice(0, 4).map((cause) => {
          const cover = cause.cover_image_url || cause.image_url
          return (
            <Link
              key={cause.id}
              href={`/fund/causes/${cause.slug}`}
              className="group shrink-0 w-64 sm:w-72 snap-start rounded-xl border border-white/5 bg-slate-900/60 overflow-hidden hover:border-emerald-500/40 transition"
            >
              <div className="relative w-full aspect-[16/9] bg-slate-800">
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="288px"
                  />
                ) : cause.logo_url ? (
                  <Image
                    src={cause.logo_url}
                    alt=""
                    fill
                    className="object-contain p-8"
                    unoptimized
                    sizes="288px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs uppercase">
                    {cause.category ?? 'CC'}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-white truncate group-hover:text-emerald-300">
                    {cause.name}
                  </h3>
                  {cause.verified && (
                    <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                {cause.organization && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{cause.organization}</p>
                )}
                {cause.short_description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                    {cause.short_description}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
