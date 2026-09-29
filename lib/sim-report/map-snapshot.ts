/**
 * Server-side map snapshot for the full simulation PDF.
 *
 * Main frame: zoomed to the sample AGEB area (Cuauhtémoc + Miguel Hidalgo)
 * with persona dots colored by vote. Inset: full CDMX alcaldías with the
 * sample area highlighted — keeps the “growing to all CDMX” message.
 *
 * Uses the same d3-geo Mercator + geoPath stack as SimMap (no custom ring
 * walkers). Chosen over headless ?captura=1 because Chromium isn’t available
 * on Vercel serverless.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { geoBounds, type GeoPermissibleObjects } from 'd3-geo'
import sharp from 'sharp'
import {
  buildAgebCodeSet,
  type AgebFeature,
  type AgebFeatureCollection,
} from '../sim-viewer/ageb-geo.ts'
import {
  isActiveAlcaldia,
  type CdmxAlcaldiaFeatureCollection,
} from '../sim-viewer/cdmx-alcaldias.ts'
import { isPersonaMappable } from '../sim-viewer/map-availability.ts'
import { optionDotFill } from '../sim-viewer/map-option-color.ts'
import { jitteredMapPoint, mapDotSeed } from '../sim-viewer/map-jitter.ts'
import {
  createAgebProjection,
  createCdmxProjection,
  type MapProjection,
} from '../sim-viewer/map-projection.ts'
import type { SimReportOptionShare, SimReportPersonaSample } from './types.ts'

const MAP_W = 900
const MAP_H = 720
const MAIN_PAD = 18
const INSET_W = 200
const INSET_H = 160
const INSET_MARGIN = 16

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function loadGeojson(): Promise<{
  ageb: AgebFeatureCollection
  cdmx: CdmxAlcaldiaFeatureCollection
}> {
  const root = process.cwd()
  const [agebRaw, cdmxRaw] = await Promise.all([
    readFile(path.join(root, 'public/geo/ageb-cuauhtemoc-mh.geojson'), 'utf8'),
    readFile(path.join(root, 'public/geo/cdmx-alcaldias.geojson'), 'utf8'),
  ])
  return {
    ageb: JSON.parse(agebRaw) as AgebFeatureCollection,
    cdmx: JSON.parse(cdmxRaw) as CdmxAlcaldiaFeatureCollection,
  }
}

function pathOrEmpty(
  projection: MapProjection,
  feature: { type: string; geometry?: unknown; properties?: unknown },
): string {
  return projection.path(feature as never) ?? ''
}

/**
 * Project polygon rings with the same `project(lng,lat)` used for dots —
 * avoids any geoPath vs point skew in the rasterizer.
 */
function projectedPolygonPath(
  projection: MapProjection,
  feature: AgebFeature | { geometry: AgebFeature['geometry'] },
): string {
  const g = feature.geometry
  const polys: number[][][][] =
    g.type === 'MultiPolygon'
      ? (g.coordinates as number[][][][])
      : [g.coordinates as number[][][]]
  const parts: string[] = []
  for (const poly of polys) {
    for (const ring of poly) {
      let d = ''
      let first = true
      for (const pt of ring) {
        if (!Array.isArray(pt) || pt.length < 2) continue
        const lng = pt[0]
        const lat = pt[1]
        if (typeof lng !== 'number' || typeof lat !== 'number') continue
        const xy = projection.project(lng, lat)
        if (!xy) continue
        d += first
          ? `M${xy[0].toFixed(2)} ${xy[1].toFixed(2)}`
          : `L${xy[0].toFixed(2)} ${xy[1].toFixed(2)}`
        first = false
      }
      if (d) parts.push(`${d}Z`)
    }
  }
  return parts.join('')
}

/**
 * Index AGEB features by code and expose the committed property centroids
 * (`centroid_lat` / `centroid_lng`). Those are guaranteed on-surface in this
 * dataset; d3 `geoCentroid` can fall outside concave AGEBs.
 */
export function indexAgebCentroids(
  features: readonly AgebFeature[],
): Map<string, { lat: number; lng: number; feature: AgebFeature }> {
  const map = new Map<string, { lat: number; lng: number; feature: AgebFeature }>()
  for (const f of features) {
    const code = f.properties?.ageb_code
    if (typeof code !== 'string' || code.length === 0) continue
    const lat = f.properties.centroid_lat
    const lng = f.properties.centroid_lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    map.set(code, { lat, lng, feature: f })
  }
  return map
}

/**
 * Snap persona coords to the geometric centroid of their AGEB when the code
 * is known. Used by the sample generator so demo PDFs never show dots outside
 * the block grid. Live API reports keep caller-supplied centroids (same as
 * Mapa mode) unless you pass `snapToAgebCentroid: true`.
 */
export function snapPersonasToAgebCentroids(
  personas: SimReportPersonaSample[],
  agebByCode: Map<string, { lat: number; lng: number; feature: AgebFeature }>,
): SimReportPersonaSample[] {
  return personas.map((p) => {
    if (!p.agebCode) return p
    const hit = agebByCode.get(p.agebCode)
    if (!hit) return p
    return {
      ...p,
      centroidLat: hit.lat,
      centroidLng: hit.lng,
    }
  })
}

export type MapSnapshotInput = {
  runId: string
  personas: SimReportPersonaSample[]
  options: SimReportOptionShare[]
  /**
   * When true, replace each mappable persona’s lat/lng with the geometric
   * centroid of its AGEB before plotting. Default false (API/live coords).
   */
  snapToAgebCentroid?: boolean
}

function renderInset(
  cdmx: CdmxAlcaldiaFeatureCollection,
  sampleBounds: [[number, number], [number, number]],
): string {
  const insetProj = createCdmxProjection(cdmx, INSET_W, INSET_H, 6)
  const alcaldiaPaths: string[] = []
  for (const f of cdmx.features) {
    const d = pathOrEmpty(insetProj, f)
    if (!d) continue
    const active = isActiveAlcaldia(f.properties.cvegeo)
    alcaldiaPaths.push(
      `<path d="${d}" fill="${active ? '#334155' : '#0f172a'}" stroke="${
        active ? '#94a3b8' : '#1e293b'
      }" stroke-width="${active ? 1.1 : 0.5}" />`,
    )
  }

  // Highlight box around sample extent (lng/lat → inset SVG).
  const [[minLng, minLat], [maxLng, maxLat]] = sampleBounds
  const corners: [number, number][] = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
  ]
  const projected = corners
    .map(([lng, lat]) => insetProj.project(lng, lat))
    .filter((p): p is [number, number] => p != null)
  let box = ''
  if (projected.length === 4) {
    const xs = projected.map((p) => p[0])
    const ys = projected.map((p) => p[1])
    const x = Math.min(...xs) - 2
    const y = Math.min(...ys) - 2
    const w = Math.max(...xs) - Math.min(...xs) + 4
    const h = Math.max(...ys) - Math.min(...ys) + 4
    box = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="#fbbf24" stroke-width="1.5" rx="1"/>`
  }

  const x0 = MAP_W - INSET_W - INSET_MARGIN
  const y0 = INSET_MARGIN
  return `
  <g transform="translate(${x0},${y0})">
    <rect x="-4" y="-4" width="${INSET_W + 8}" height="${INSET_H + 22}" rx="4" fill="#020617" stroke="#334155" stroke-width="1"/>
    <rect x="0" y="0" width="${INSET_W}" height="${INSET_H}" fill="#0a0f14"/>
    ${alcaldiaPaths.join('')}
    ${box}
    <text x="4" y="${INSET_H + 12}" fill="#94a3b8" font-size="9" font-family="Helvetica, Arial, sans-serif">CDMX · muestra resaltada</text>
  </g>`
}

/**
 * Build a PNG buffer of the simulation map. Returns null when geo cannot
 * load or fewer than one persona is mappable (never invents dots).
 */
export async function renderSimMapSnapshotPng(
  input: MapSnapshotInput,
): Promise<Buffer | null> {
  let ageb: AgebFeatureCollection
  let cdmx: CdmxAlcaldiaFeatureCollection
  try {
    ;({ ageb, cdmx } = await loadGeojson())
  } catch (err) {
    console.warn('[sim-report] map geojson load failed:', err)
    return null
  }

  const codes = buildAgebCodeSet(ageb.features)
  const agebCentroids = indexAgebCentroids(ageb.features)
  const optionIndex = new Map<string, number>()
  input.options.forEach((o, i) => optionIndex.set(o.optionId, i))

  let personas = input.personas
  if (input.snapToAgebCentroid) {
    personas = snapPersonasToAgebCentroids(personas, agebCentroids)
  }

  const mappable = personas.filter((p) =>
    isPersonaMappable(
      {
        agebCode: p.agebCode,
        centroidLat: p.centroidLat,
        centroidLng: p.centroidLng,
      },
      codes,
    ),
  )
  if (mappable.length === 0) return null

  // Fit the main frame to AGEBs that actually have personas (not the full
  // Cuau/MH mesh). Fitting all 283 blocks left the southern half empty and
  // made northern dots look "above" the grid even when they were on-fill.
  const usedCodes = new Set(
    mappable
      .map((p) => p.agebCode)
      .filter((c): c is string => typeof c === 'string' && c.length > 0),
  )
  const usedFeatures = ageb.features.filter((f) =>
    usedCodes.has(f.properties.ageb_code),
  )
  const fitCollection: AgebFeatureCollection = {
    type: 'FeatureCollection',
    features: usedFeatures.length > 0 ? usedFeatures : ageb.features,
  }
  const mainProj = createAgebProjection(fitCollection, MAP_W, MAP_H, MAIN_PAD)

  // Faint active-alcaldía outlines behind AGEBs for context.
  const alcaldiaPaths: string[] = []
  for (const f of cdmx.features) {
    if (!isActiveAlcaldia(f.properties.cvegeo)) continue
    const d = pathOrEmpty(mainProj, f)
    if (!d) continue
    alcaldiaPaths.push(
      `<path d="${d}" fill="#111827" stroke="#475569" stroke-width="1.4" />`,
    )
  }

  // Draw only AGEBs that have personas in this run. Faint empty neighbors
  // made northern dots look "above the grid" even when they were on-fill.
  const agebPaths: string[] = []
  for (const f of fitCollection.features) {
    const d = projectedPolygonPath(mainProj, f)
    if (!d) continue
    agebPaths.push(
      `<path d="${d}" fill="rgba(30,58,95,0.72)" stroke="#7dd3fc" stroke-width="1.1"/>`,
    )
  }

  const dots: string[] = []
  for (let i = 0; i < mappable.length; i++) {
    const p = mappable[i]!
    // Prefer exact AGEB property centroids when snapped; otherwise the same
    // tiny jitter as Mapa mode so co-located agents stay distinguishable.
    let lat = p.centroidLat as number
    let lng = p.centroidLng as number
    if (!input.snapToAgebCentroid) {
      const seed = mapDotSeed(input.runId, p.personaKey, i)
      const jittered = jitteredMapPoint(seed, lat, lng)
      lat = jittered.lat
      lng = jittered.lng
    }
    const xy = mainProj.project(lng, lat)
    if (!xy) continue
    const idx = p.optionId != null ? (optionIndex.get(p.optionId) ?? 0) : 0
    const fill = optionDotFill(idx)
    dots.push(
      `<circle cx="${xy[0].toFixed(2)}" cy="${xy[1].toFixed(2)}" r="3.6" fill="${fill}" stroke="#0a0f14" stroke-width="1.2" />`,
    )
  }

  // Legend sits above a dedicated source band so labels never collide with
  // the INEGI attribution line.
  const SOURCE_BAND_H = 26
  const legendItems = input.options.slice(0, 6)
  const legendLineH = 15
  const legendGapAboveSource = 14
  const legendBlockH = Math.max(legendLineH, legendItems.length * legendLineH)
  const legendBottom = MAP_H - SOURCE_BAND_H - legendGapAboveSource
  const legendTop = legendBottom - legendBlockH + legendLineH / 2
  const legend = legendItems
    .map((o, i) => {
      const fill = optionDotFill(i)
      const y = legendTop + i * legendLineH
      return `<circle cx="22" cy="${y}" r="4" fill="${fill}" stroke="#fef3c7" stroke-width="0.5"/><text x="32" y="${
        y + 3.5
      }" fill="#e2e8f0" font-size="11" font-family="Helvetica, Arial, sans-serif">${escapeXml(
        o.label,
      )}</text>`
    })
    .join('')

  const sampleBounds = geoBounds(fitCollection as GeoPermissibleObjects) as [
    [number, number],
    [number, number],
  ]
  const inset = renderInset(cdmx, sampleBounds)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
  <rect width="100%" height="100%" fill="#0a0f14"/>
  <g>${alcaldiaPaths.join('')}</g>
  <g>${agebPaths.join('')}</g>
  <g>${dots.join('')}</g>
  <g>${legend}</g>
  ${inset}
  <rect x="0" y="${MAP_H - SOURCE_BAND_H}" width="${MAP_W}" height="${SOURCE_BAND_H}" fill="#020617"/>
  <text x="${MAIN_PAD}" y="${MAP_H - 9}" fill="#94a3b8" font-size="10" font-family="Helvetica, Arial, sans-serif">Fuente: INEGI. Marco Geoestadístico, Censo de Población y Vivienda 2020. · Muestra: Cuauhtémoc y Miguel Hidalgo</text>
</svg>`

  try {
    const png = await sharp(Buffer.from(svg, 'utf8')).png().toBuffer()
    return png
  } catch (err) {
    console.warn('[sim-report] sharp SVG→PNG failed:', err)
    return null
  }
}
