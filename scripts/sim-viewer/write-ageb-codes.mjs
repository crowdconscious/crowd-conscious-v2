#!/usr/bin/env node
/**
 * Regenerate lib/sim-viewer/ageb-codes.ts from the verified GeoJSON.
 * Never invents codes.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const geo = JSON.parse(
  readFileSync(join(root, 'public/geo/ageb-cuauhtemoc-mh.geojson'), 'utf8'),
)
const codes = geo.features.map((f) => f.properties.ageb_code)
const body = `/**
 * AGEB code list extracted from public/geo/ageb-cuauhtemoc-mh.geojson.
 * Used by the Mapa availability gate without bundling polygon geometry.
 *
 * Regenerate: node scripts/sim-viewer/write-ageb-codes.mjs
 * Do not invent codes — only copy from the verified GeoJSON.
 */
export const AGEB_GEO_CODES: readonly string[] = ${JSON.stringify(codes, null, 2)} as const

export function agebGeoCodeSet(): Set<string> {
  return new Set(AGEB_GEO_CODES)
}
`
writeFileSync(join(root, 'lib/sim-viewer/ageb-codes.ts'), body)
console.log(`wrote ${codes.length} codes`)
