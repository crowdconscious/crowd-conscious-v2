/**
 * Generate sample summary + full simulation PDFs from the committed fixture.
 *
 *   SIM_REPORT_ENABLED=true npx tsx scripts/sim-report/generate-samples.ts
 *
 * Persona lat/lng are snapped to AGEB property centroids from
 * `public/geo/ageb-cuauhtemoc-mh.geojson` (on-surface; preferred over d3
 * geoCentroid which can fall outside concave blocks).
 *
 * Writes:
 *   docs/samples/sim-report-summary.pdf
 *   docs/samples/sim-report-full.pdf
 *   docs/samples/sim-report-map.png (map snapshot alone)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { assembleSimReportData } from '../../lib/sim-report/assemble.ts'
import {
  indexAgebCentroids,
  renderSimMapSnapshotPng,
  snapPersonasToAgebCentroids,
} from '../../lib/sim-report/map-snapshot.ts'
import { generateSimFullPdf } from '../../lib/sim-report/pdf-full.ts'
import { generateSimSummaryPdf } from '../../lib/sim-report/pdf-summary.ts'
import type { AgebFeatureCollection } from '../../lib/sim-viewer/ageb-geo.ts'
import type { SimulationReplayPayload } from '../../types/simulation.ts'

async function main() {
  const root = process.cwd()
  const outDir = path.join(root, 'docs/samples')
  await mkdir(outDir, { recursive: true })

  const raw = await readFile(
    path.join(root, 'fixtures/simulation-run.json'),
    'utf8',
  )
  const payload = JSON.parse(raw) as SimulationReplayPayload

  const ageb = JSON.parse(
    await readFile(
      path.join(root, 'public/geo/ageb-cuauhtemoc-mh.geojson'),
      'utf8',
    ),
  ) as AgebFeatureCollection
  const agebByCode = indexAgebCentroids(ageb.features)

  // Demo track row: fixture has real aggregates — treat as scored.
  // Also exercise on-the-fly compute: leave divergence_score null (older runs).
  const realN =
    payload.realAggregates?.reduce((s, a) => s + (a.count || 0), 0) ?? 0
  const track = {
    divergence_score: null as number | null,
    has_real_data: realN > 0,
    real_vote_count: realN,
    outcome: realN > 0 ? 'scored' : 'no_real_data',
    simulated_distribution: null,
    real_distribution: null,
  }

  let base = assembleSimReportData({
    payload,
    track,
    runExtras: {
      personaVersion: 'fixture-cdmx-v1',
      model: payload.run.model,
    },
    generatedAt: '2026-09-29T12:00:00.000Z',
  })
  base.run.revealedAt = '2026-09-01T12:00:00.000Z'
  // Snap demo personas onto true AGEB centroids for the sample artifacts.
  base = {
    ...base,
    personas: snapPersonasToAgebCentroids(base.personas, agebByCode),
  }

  const mapPng = await renderSimMapSnapshotPng({
    runId: payload.run.id,
    personas: base.personas,
    options: base.simulated,
    // Personas already snapped to GeoJSON property centroids above.
    snapToAgebCentroid: true,
  })

  if (mapPng) {
    await writeFile(path.join(outDir, 'sim-report-map.png'), mapPng)
    console.log('wrote docs/samples/sim-report-map.png', mapPng.length, 'bytes')
  } else {
    console.warn('map snapshot unavailable (fixture AGEBs may not match geojson)')
  }

  const summaryPdf = await generateSimSummaryPdf(base)
  await writeFile(path.join(outDir, 'sim-report-summary.pdf'), summaryPdf)
  console.log(
    'wrote docs/samples/sim-report-summary.pdf',
    summaryPdf.length,
    'bytes',
  )

  const fullPdf = await generateSimFullPdf({ ...base, mapPng })
  await writeFile(path.join(outDir, 'sim-report-full.pdf'), fullPdf)
  console.log('wrote docs/samples/sim-report-full.pdf', fullPdf.length, 'bytes')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
