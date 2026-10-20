'use client'

/**
 * Choropleth for the Observatorio demo. Reuses the CDMX simulation map's
 * committed geometry (public/geo/cdmx-alcaldias.geojson, colonias-cuau-mh.geojson)
 * plus the demo's simplified colonia polygons (public/observatorio-rentas/colonias.geojson) and its d3-geo projection helper (lib/sim-viewer/map-projection). No tiles,
 * no runtime external calls.
 */
import { useEffect, useMemo, useState } from 'react'
import { geoArea, type GeoPermissibleObjects } from 'd3-geo'
import { createCdmxProjection } from '@/lib/sim-viewer/map-projection'
import { CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH, type CdmxAlcaldiaFeatureCollection } from '@/lib/sim-viewer/cdmx-alcaldias'
import { OBS_COLORS as C, OBS_MIN_N, OBS_THRESHOLDS } from '@/lib/observatorio-rentas/config'
import { RISK_LABEL, coloniaRisk, fmtInt, fmtMoney, fmtPct, isWatch, type Aggregate, type Colonia } from '@/lib/observatorio-rentas/model'
import { RISK_COLOR } from './ui'

export type MapLayer = 'compliance' | 'rent' | 'change12' | 'speculation' | 'shortterm'
export const LAYERS: { id: MapLayer; label: string }[] = [
  { id: 'compliance', label: 'Cumplimiento del tope' },
  { id: 'rent', label: 'Renta anunciada' },
  { id: 'change12', label: 'Variación 12 meses' },
  { id: 'speculation', label: 'Señal de especulación' },
  { id: 'shortterm', label: 'Renta de corto plazo' },
]

type ColFeature = { type: 'Feature'; properties: { colonia: string; cve_col: string; alc: string }; geometry: GeoPermissibleObjects }
type GeoBundle = { alc: CdmxAlcaldiaFeatureCollection; col: { type: 'FeatureCollection'; features: ColFeature[] } }
let geoCache: GeoBundle | null = null
let geoPromise: Promise<GeoBundle> | null = null
function loadGeo() {
  if (geoCache) return Promise.resolve(geoCache)
  geoPromise ??= Promise.all([
    fetch(CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH).then((r) => r.json()),
    fetch('/observatorio-rentas/colonias.geojson').then((r) => r.json()),
  ]).then(([alc, col]) => {
    // RFC 7946 rings are counter-clockwise; d3-geo expects clockwise. Rewind any feature whose spherical area is > hemisphere.
    for (const f of col.features as ColFeature[]) {
      if (geoArea(f as unknown as GeoPermissibleObjects) > 2 * Math.PI) {
        const g = f.geometry as unknown as { type: string; coordinates: number[][][] | number[][][][] }
        if (g.type === 'Polygon') (g.coordinates as number[][][]).forEach((r) => r.reverse())
        else (g.coordinates as number[][][][]).forEach((p) => p.forEach((r) => r.reverse()))
      }
    }
    const g: GeoBundle = { alc, col }; geoCache = g; return g
  })
  return geoPromise
}

const SEQ = ['#0F2A2E', '#124048', '#16606A', '#1E8591', '#2BB3C0', '#7FDCE4']
function seq(v: number, min: number, max: number) {
  const t = Math.max(0, Math.min(0.999, (v - min) / (max - min)))
  return SEQ[Math.floor(t * SEQ.length)]
}
const RANGES = { rent: [8000, 32000], change12: [2, 16], shortterm: [0, 400] } as const

function fillFor(layer: MapLayer, v: { risk: Aggregate['risk']; rent: number; ch12: number; watchShare: number; st: number }) {
  if (layer === 'compliance') return v.risk === 'nodata' ? 'url(#obs-hatch)' : RISK_COLOR[v.risk]
  if (layer === 'rent') return seq(v.rent, ...RANGES.rent)
  if (layer === 'change12') return seq(v.ch12, ...RANGES.change12)
  if (layer === 'speculation') return seq(v.watchShare, 0, 1)
  return seq(v.st, ...RANGES.shortterm)
}

export function Legend({ layer }: { layer: MapLayer }) {
  if (layer === 'compliance') {
    return (
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Leyenda">
        {(['within', 'near', 'above'] as const).map((k) => (
          <li key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: RISK_COLOR[k] }} />{RISK_LABEL[k]}</li>
        ))}
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden><rect width="12" height="12" fill="url(#obs-hatch-legend)" /><defs><pattern id="obs-hatch-legend" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#2A3236" /><line x1="0" y1="0" x2="0" y2="4" stroke="#7A868B" strokeWidth="1.5" /></pattern></defs></svg>Sin datos suficientes (n&lt;{OBS_MIN_N})</li>
        <li className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ border: `2px solid ${C.turquoise}` }} />A vigilar (alza especulativa)</li>
      </ul>
    )
  }
  const labels: Record<Exclude<MapLayer, 'compliance'>, [string, string, string]> = {
    rent: ['Renta mediana anunciada', fmtMoney(RANGES.rent[0]), fmtMoney(RANGES.rent[1]) + '+'],
    change12: ['Variación 12 meses', fmtPct(RANGES.change12[0]), fmtPct(RANGES.change12[1]) + '+'],
    speculation: ['% de colonias a vigilar', '0%', '100%'],
    shortterm: ['Anuncios de corto plazo', '0', fmtInt(RANGES.shortterm[1]) + '+'],
  }
  const [t, a, b] = labels[layer]
  return (
    <div className="text-xs" aria-label="Leyenda">
      <div className="mb-1">{t}{layer === 'speculation' && ` (alza 12m > ${OBS_THRESHOLDS.watchInflationMultiple}× inflación o > ${OBS_THRESHOLDS.watchChange4wPct}% en 4 semanas)`}</div>
      <div className="flex items-center gap-2"><span>{a}</span><span className="flex">{SEQ.map((c) => <span key={c} className="w-6 h-3 inline-block" style={{ background: c }} />)}</span><span>{b}</span></div>
    </div>
  )
}

export function ObsMap({
  layer, alcaldias, colonias, selected, onSelectAlcaldia, onSelectColonia, height = 520,
}: {
  layer: MapLayer
  alcaldias: Aggregate[]
  colonias: Colonia[]
  selected: string | null
  onSelectAlcaldia: (cvegeo: string | null) => void
  onSelectColonia?: (id: string) => void
  height?: number
}) {
  const [geo, setGeo] = useState<GeoBundle | null>(geoCache)
  const [hover, setHover] = useState<string | null>(null)
  useEffect(() => { void loadGeo().then(setGeo) }, [])
  const W = 600, H = 600
  const proj = useMemo(() => {
    if (!geo) return null
    const target = selected ? geo.alc.features.find((f) => f.properties.cvegeo === selected) : null
    if (!target) return createCdmxProjection(geo.alc as unknown as GeoPermissibleObjects, W, H, 16)
    // Fit to the feature's vertices (MultiPoint) so ring winding order can't invert the bounds.
    const pts: number[][] = []
    const walk = (c: unknown): void => { if (Array.isArray(c) && typeof c[0] === 'number') pts.push(c as number[]); else if (Array.isArray(c)) c.forEach(walk) }
    walk(target.geometry.coordinates)
    return createCdmxProjection({ type: 'MultiPoint', coordinates: pts } as GeoPermissibleObjects, W, H, 24)
  }, [geo, selected])
  const byCve = useMemo(() => new Map(alcaldias.map((a) => [a.key, a])), [alcaldias])
  const colByCve = useMemo(() => new Map(colonias.map((c) => [c.cve_col, c])), [colonias])
  if (!geo || !proj) return <div style={{ height }} className="grid place-items-center obs-muted" role="status">Cargando mapa…</div>

  const selColFeatures = selected ? geo.col.features.filter((f) => colByCve.get(f.properties.cve_col)?.cvegeo === selected) : []
  const hoverText = (() => {
    if (!hover) return null
    const a = byCve.get(hover)
    if (a) return `${a.nombre} · ${RISK_LABEL[a.risk]} · renta ${fmtMoney(a.asking_rent_median)} · 12m ${fmtPct(a.asking_change_12m)}`
    const c = colonias.find((x) => x.id === hover)
    if (c) return `${c.nombre} · ${RISK_LABEL[coloniaRisk(c)]} · renta ${fmtMoney(c.asking_rent_median)} · 12m ${fmtPct(c.asking_change_12m)}`
    return null
  })()

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: height }} role="group" aria-label={selected ? 'Mapa de colonias' : 'Mapa de alcaldías de la Ciudad de México'}>
        <defs>
          <pattern id="obs-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#2A3236" /><line x1="0" y1="0" x2="0" y2="6" stroke="#7A868B" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="#07090A" onClick={() => onSelectAlcaldia(null)} />
        {geo.alc.features.map((f) => {
          const a = byCve.get(f.properties.cvegeo)
          if (!a) return null
          const isSel = selected === a.key
          const dim = selected && !isSel
          const watch = layer === 'compliance' && !selected && a.watch_count / a.colonias >= 0.5
          const d = proj.path(f as unknown as GeoPermissibleObjects) ?? ''
          return (
            <path key={a.key} d={d} role="button" tabIndex={0} aria-label={`${a.nombre}: ${RISK_LABEL[a.risk]}`}
              fill={isSel && selColFeatures.length ? '#0E1416' : fillFor(layer, { risk: a.risk, rent: a.asking_rent_median, ch12: a.asking_change_12m, watchShare: a.watch_count / a.colonias, st: a.short_term_listings / 8 })}
              opacity={dim ? 0.18 : 1} stroke={watch ? C.turquoise : '#07090A'} strokeWidth={watch ? 2.2 : 1.2}
              style={{ cursor: 'pointer', transition: 'opacity .2s' }}
              onMouseEnter={() => setHover(a.key)} onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); onSelectAlcaldia(isSel ? null : a.key) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectAlcaldia(isSel ? null : a.key) } }}
              data-tour={a.key === '09015' ? 'cuauhtemoc' : undefined}
            />
          )
        })}
        {selColFeatures.map((f) => {
          const c = colByCve.get(f.properties.cve_col)!
          const risk = coloniaRisk(c)
          const watch = isWatch(c.asking_change_12m, c.asking_change_4w)
          return (
            <path key={c.id} d={proj.path(f.geometry) ?? ''} role="button" tabIndex={0} aria-label={`${c.nombre}: ${RISK_LABEL[risk]}`}
              fill={fillFor(layer, { risk, rent: c.asking_rent_median, ch12: c.asking_change_12m, watchShare: watch ? 1 : 0, st: c.short_term_listings })}
              stroke={layer === 'compliance' && watch ? C.turquoise : '#07090A'} strokeWidth={layer === 'compliance' && watch ? 1.6 : 0.6}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); onSelectColonia?.(c.id) }}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelectColonia?.(c.id) }}
            />
          )
        })}
        {!selected && geo.alc.features.map((f) => {
          const p = proj.project(f.properties.label_lng, f.properties.label_lat)
          if (!p) return null
          const n = f.properties.nombre.replace('Cuajimalpa de Morelos', 'Cuajimalpa').replace('La Magdalena Contreras', 'Magdalena C.').replace('Gustavo A. Madero', 'G. A. Madero').replace('Venustiano Carranza', 'V. Carranza')
          return <text key={f.properties.cvegeo} x={p[0]} y={p[1]} textAnchor="middle" fontSize="11" fontWeight="700" fill="#07090A" stroke="#ffffffaa" strokeWidth="3" paintOrder="stroke" pointerEvents="none">{n}</text>
        })}
      </svg>
      <div className="absolute left-2 top-2 rounded-lg px-2 py-1 text-xs pointer-events-none" style={{ background: '#0E1416ee', minHeight: 24 }} aria-live="polite">
        {hoverText ?? (selected ? 'Toca una colonia para ver su ficha · toca fuera para volver' : 'Toca una alcaldía para ver sus colonias')}
      </div>
    </div>
  )
}
