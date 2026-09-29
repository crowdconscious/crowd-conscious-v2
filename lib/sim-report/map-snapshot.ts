/**
 * Server-side map snapshot for the full simulation PDF.
 *
 * Renders the same geo layers the Mapa viewer uses (CDMX alcaldías outline +
 * AGEB blocks + persona dots colored by vote) to SVG, then rasterizes with
 * sharp. Chosen over headless capture (?captura=1) because:
 *   - No Chromium / Playwright on Vercel serverless
 *   - Deterministic, fast, and uses the already-committed GeoJSON + projection
 *   - Same visual contract as SimMap without shipping a browser
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  buildAgebCodeSet,
  type AgebFeatureCollection,
} from '@/lib/sim-viewer/ageb-geo'
import {
  isActiveAlcaldia,
  type CdmxAlcaldiaFeatureCollection,
} from '@/lib/sim-viewer/cdmx-alcaldias'
import { isPersonaMappable } from '@/lib/sim-viewer/map-availability'
import { optionDotFill } from '@/lib/sim-viewer/map-option-color'
import { jitteredMapPoint, mapDotSeed } from '@/lib/sim-viewer/map-jitter'
import { createCdmxProjection } from '@/lib/sim-viewer/map-projection'
import type { SimReportOptionShare, SimReportPersonaSample } from './types.ts'

const MAP_W = 900
const MAP_H = 720
const PAD = 18

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pathFromCoords(
  coords: unknown,
  project: (lng: number, lat: number) => [number, number] | null,
): string {
  if (!Array.isArray(coords) || coords.length === 0) return ''
  // Polygon: number[][][]  MultiPolygon: number[][][][]
  const isMulti =
    Array.isArray(coords[0]) &&
    Array.isArray((coords[0] as unknown[])[0]) &&
    Array.isArray(((coords[0] as unknown[])[0] as unknown[])[0]) &&
    typeof ((((coords[0] as unknown[])[0] as unknown[])[0] as unknown[])[0]) ===
      'number'

  const rings: number[][][] = isMulti
    ? (coords as number[][][][]).flat()
    : (coords as number[][][])

  const parts: string[] = []
  for (const ring of rings) {
    let d = ''
    let first = true
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue
      const lng = pt[0]
      const lat = pt[1]
      if (typeof lng !== 'number' || typeof lat !== 'number') continue
      const xy = project(lng, lat)
      if (!xy) continue
      d += first ? `M${xy[0].toFixed(2)},${xy[1].toFixed(2)}` : `L${xy[0].toFixed(2)},${xy[1].toFixed(2)}`
      first = false
    }
    if (d) parts.push(`${d}Z`)
  }
  return parts.join('')
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

export type MapSnapshotInput = {
  runId: string
  personas: SimReportPersonaSample[]
  options: SimReportOptionShare[]
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
  const optionIndex = new Map<string, number>()
  input.options.forEach((o, i) => optionIndex.set(o.optionId, i))

  const mappable = input.personas.filter((p) =>
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

  const projection = createCdmxProjection(cdmx, MAP_W, MAP_H, PAD)

  const alcaldiaPaths: string[] = []
  for (const f of cdmx.features) {
    const d = pathFromCoords(f.geometry.coordinates, projection.project)
    if (!d) continue
    const active = isActiveAlcaldia(f.properties.cvegeo)
    alcaldiaPaths.push(
      `<path d="${d}" fill="${active ? '#1e293b' : '#0f172a'}" stroke="${
        active ? '#64748b' : '#334155'
      }" stroke-width="${active ? 1.2 : 0.6}" />`,
    )
  }

  const agebPaths: string[] = []
  for (const f of ageb.features) {
    const d = pathFromCoords(f.geometry.coordinates, projection.project)
    if (!d) continue
    agebPaths.push(
      `<path d="${d}" fill="rgba(51,65,85,0.35)" stroke="#475569" stroke-width="0.4" />`,
    )
  }

  const dots: string[] = []
  for (let i = 0; i < mappable.length; i++) {
    const p = mappable[i]!
    const seed = mapDotSeed(input.runId, p.personaKey, i)
    const jittered = jitteredMapPoint(
      seed,
      p.centroidLat as number,
      p.centroidLng as number,
    )
    const xy = projection.project(jittered.lng, jittered.lat)
    if (!xy) continue
    const idx =
      p.optionId != null ? (optionIndex.get(p.optionId) ?? 0) : 0
    const fill = optionDotFill(idx)
    dots.push(
      `<circle cx="${xy[0].toFixed(2)}" cy="${xy[1].toFixed(2)}" r="3.2" fill="${fill}" stroke="#fef3c7" stroke-width="0.6" />`,
    )
  }

  const legend = input.options
    .slice(0, 6)
    .map((o, i) => {
      const fill = optionDotFill(i)
      const y = 28 + i * 16
      return `<circle cx="24" cy="${y}" r="4" fill="${fill}" stroke="#fef3c7" stroke-width="0.5"/><text x="34" y="${
        y + 3.5
      }" fill="#e2e8f0" font-size="11" font-family="Helvetica, Arial, sans-serif">${escapeXml(
        o.label,
      )}</text>`
    })
    .join('')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${MAP_H}" viewBox="0 0 ${MAP_W} ${MAP_H}">
  <rect width="100%" height="100%" fill="#0a0f14"/>
  <g>${alcaldiaPaths.join('')}</g>
  <g>${agebPaths.join('')}</g>
  <g>${dots.join('')}</g>
  <g>${legend}</g>
  <text x="${PAD}" y="${MAP_H - 14}" fill="#94a3b8" font-size="10" font-family="Helvetica, Arial, sans-serif">Fuente: INEGI. Marco Geoestadístico, Censo de Población y Vivienda 2020. · Muestra: Cuauhtémoc y Miguel Hidalgo</text>
</svg>`

  try {
    const png = await sharp(Buffer.from(svg, 'utf8')).png().toBuffer()
    return png
  } catch (err) {
    console.warn('[sim-report] sharp SVG→PNG failed:', err)
    return null
  }
}
