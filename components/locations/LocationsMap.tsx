'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LocationCardRow } from './LocationCard'
import { CDMX_CENTER } from '@/lib/locations/geo'

/**
 * Leaflet's default marker icons reference assets via webpack `require`,
 * which fails under Next.js. We replace the icon with a tiny inline SVG
 * pin that matches the Conscious palette — no extra http requests, no
 * broken image fallback.
 */
const conscientePinSvg = (color: string) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 44' width='32' height='44'>
     <path fill='${color}' stroke='white' stroke-width='2' d='M16 2c7.7 0 14 6.3 14 14 0 9.5-12.4 24.4-13 25.1a1.3 1.3 0 0 1-2 0C14.4 40.4 2 25.5 2 16 2 8.3 8.3 2 16 2z'/>
     <circle cx='16' cy='16' r='5' fill='white'/>
   </svg>`
)}`

function pinIcon(score: number | null): L.DivIcon {
  const color = score == null ? '#64748b' : score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#94a3b8'
  return L.icon({
    iconUrl: conscientePinSvg(color),
    iconSize: [32, 44],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36],
  }) as unknown as L.DivIcon
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [map, points])
  return null
}

type Props = {
  locations: LocationCardRow[]
  locale: 'es' | 'en'
  linkPrefix?: string
}

export default function LocationsMap({ locations, locale, linkPrefix = '/locations' }: Props) {
  const withCoords = useMemo(
    () =>
      locations.filter(
        (l): l is LocationCardRow & { latitude: number; longitude: number } =>
          typeof l.latitude === 'number' && typeof l.longitude === 'number'
      ),
    [locations]
  )

  const points = useMemo<[number, number][]>(
    () => withCoords.map((l) => [l.latitude, l.longitude]),
    [withCoords]
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2d3748] bg-[#0f1419]">
      <div className="h-[480px] w-full">
        <MapContainer
          center={[CDMX_CENTER.lat, CDMX_CENTER.lng]}
          zoom={13}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', background: '#0f1419' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <FitBounds points={points} />
          {withCoords.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.latitude, loc.longitude]}
              icon={pinIcon(loc.conscious_score)}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>{loc.name}</strong>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                    {loc.neighborhood ? `${loc.neighborhood} · ` : ''}
                    {loc.city}
                  </div>
                  {loc.conscious_score != null ? (
                    <div
                      style={{
                        display: 'inline-block',
                        background: loc.conscious_score >= 8 ? '#10b981' : '#f59e0b',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      {loc.conscious_score.toFixed(1)} / 10
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      {locale === 'es'
                        ? `${loc.total_votes ?? 0} votos · esperando revelación`
                        : `${loc.total_votes ?? 0} votes · awaiting reveal`}
                    </div>
                  )}
                  <Link
                    href={`${linkPrefix}/${loc.slug}`}
                    style={{
                      display: 'inline-block',
                      background: '#10b981',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    {locale === 'es' ? 'Votar ↗' : 'Vote ↗'}
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {withCoords.length === 0 ? (
        <p className="border-t border-[#2d3748] bg-[#1a2029] px-4 py-3 text-center text-xs text-slate-500">
          {locale === 'es'
            ? 'Aún no hay lugares con coordenadas para mostrar en el mapa.'
            : 'No locations with coordinates yet.'}
        </p>
      ) : null}
    </div>
  )
}
