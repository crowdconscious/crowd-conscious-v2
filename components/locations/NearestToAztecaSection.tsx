'use client'

import Link from 'next/link'
import { Trophy, MapPin } from 'lucide-react'
import { useMemo } from 'react'
import type { LocationCardRow } from './LocationCard'
import { LocationCoverImage } from '@/components/locations/LocationRemoteImage'
import { ESTADIO_AZTECA, approxMinutesByCar, haversineKm } from '@/lib/locations/geo'

type Props = {
  locations: LocationCardRow[]
  locale: 'es' | 'en'
  limit?: number
  linkPrefix?: string
}

export function NearestToAztecaSection({
  locations,
  locale,
  limit = 3,
  linkPrefix = '/locations',
}: Props) {
  const ranked = useMemo(() => {
    return locations
      .filter(
        (l): l is LocationCardRow & { latitude: number; longitude: number } =>
          typeof l.latitude === 'number' && typeof l.longitude === 'number'
      )
      .map((l) => {
        const distanceKm = haversineKm(
          { lat: l.latitude, lng: l.longitude },
          { lat: ESTADIO_AZTECA.lat, lng: ESTADIO_AZTECA.lng }
        )
        return { loc: l, distanceKm, minutes: approxMinutesByCar(distanceKm) }
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit)
  }, [locations, limit])

  if (ranked.length === 0) return null

  return (
    <section className="mb-12 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-emerald-500/5 p-6 sm:p-8">
      <div className="mb-6 flex items-start gap-3">
        <Trophy className="mt-1 h-6 w-6 shrink-0 text-amber-400" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            {locale === 'es' ? 'Mundial 2026' : 'World Cup 2026'}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
            {locale === 'es'
              ? 'Lugares Conscientes cerca del Estadio Azteca'
              : 'Conscious Locations near Estadio Azteca'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {locale === 'es'
              ? 'Cuando llegues al partido, ya sabes dónde apoyar negocios verificados por la comunidad.'
              : 'When you get to the match, you know where to support community-verified businesses.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ranked.map(({ loc, distanceKm, minutes }) => (
          <Link
            key={loc.id}
            href={`${linkPrefix}/${loc.slug}`}
            className="group flex overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] transition-colors hover:border-emerald-500/50"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-[#0f1419]">
              <LocationCoverImage
                url={loc.cover_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white group-hover:text-emerald-300">
                  {loc.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {loc.neighborhood ? `${loc.neighborhood} · ` : ''}
                  {loc.city}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                  <MapPin className="h-3 w-3" />
                  {locale === 'es'
                    ? `~${minutes} min del Estadio`
                    : `~${minutes} min from stadium`}
                </span>
                <span className="text-[11px] text-slate-500">{distanceKm.toFixed(1)} km</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
