#!/usr/bin/env node
/**
 * Rematch fixture persona AGEB codes to verified INEGI GeoJSON centroids.
 *
 * Reads public/geo/ageb-cuauhtemoc-mh.geojson and rewrites:
 *   - fixtures/simulation-run.fixture.json  (admin / open fixture viewer)
 *   - fixtures/simulation-run.json          (Task 1 seed wire shape)
 *
 * Rules (Task 4b):
 *   - Only use ageb_code values that exist in the GeoJSON.
 *   - Place each persona at that feature's centroid_lat/lng plus a tiny
 *     deterministic jitter (map-jitter.ts) so co-located agents separate.
 *   - Keep grounding.isExample: true — fixture data, not a real census draw.
 *   - Never invent CVEGEO codes.
 *
 * Usage: node --experimental-strip-types scripts/sim-viewer/rematch-fixture-agebs.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { AgebFeature, AgebFeatureCollection } from '../../lib/sim-viewer/ageb-geo.ts'
import { featuresByAlcaldia } from '../../lib/sim-viewer/ageb-geo.ts'
import { jitteredMapPoint, mapDotSeed } from '../../lib/sim-viewer/map-jitter.ts'

const ROOT = process.cwd()
const GEO_PATH = join(ROOT, 'public/geo/ageb-cuauhtemoc-mh.geojson')
const TARGETS = [
  join(ROOT, 'fixtures/simulation-run.fixture.json'),
  join(ROOT, 'fixtures/simulation-run.json'),
] as const

type Persona = {
  personaKey: string
  alcaldia: string
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
  grounding?: {
    isExample?: boolean
    ageb?: { code?: string; [k: string]: unknown }
    [k: string]: unknown
  }
  [k: string]: unknown
}

type Vote = {
  sequenceIndex: number
  persona: Persona
  [k: string]: unknown
}

type Payload = {
  _comment?: string
  votes: Vote[]
  run: { id: string; [k: string]: unknown }
  [k: string]: unknown
}

function pickPool(geo: AgebFeatureCollection, alcaldia: string): AgebFeature[] {
  if (alcaldia === 'Cuauhtémoc' || alcaldia === 'Miguel Hidalgo') {
    const pool = featuresByAlcaldia(geo.features, alcaldia)
    if (pool.length === 0) {
      throw new Error(`No AGEB features for alcaldía ${alcaldia}`)
    }
    return pool
  }
  throw new Error(`Unexpected alcaldía in fixture: ${alcaldia}`)
}

function rematchPayload(raw: Payload, geo: AgebFeatureCollection): Payload {
  const runId = String(raw.run.id)
  const counters = new Map<string, number>()

  const votes = raw.votes.map((vote) => {
    const persona = vote.persona
    const pool = pickPool(geo, persona.alcaldia)
    const n = counters.get(persona.alcaldia) ?? 0
    counters.set(persona.alcaldia, n + 1)
    const feature = pool[n % pool.length]!
    const props = feature.properties
    const seed = mapDotSeed(runId, persona.personaKey, vote.sequenceIndex)
    const pt = jitteredMapPoint(seed, props.centroid_lat, props.centroid_lng)

    const grounding = persona.grounding
      ? {
          ...persona.grounding,
          isExample: true as const,
          ageb: {
            ...(persona.grounding.ageb ?? {}),
            code: props.ageb_code,
          },
        }
      : undefined

    return {
      ...vote,
      persona: {
        ...persona,
        agebCode: props.ageb_code,
        centroidLat: pt.lat,
        centroidLng: pt.lng,
        ...(grounding ? { grounding } : {}),
      },
    }
  })

  return {
    ...raw,
    _mapFixtureNote:
      'Task 4b: agebCode + centroids taken from public/geo/ageb-cuauhtemoc-mh.geojson (INEGI MG CPV 2020) with deterministic map-jitter offsets. Fixture / isExample data — not real census microdata or real Pulse locations.',
    votes,
  }
}

function main() {
  const geo = JSON.parse(readFileSync(GEO_PATH, 'utf8')) as AgebFeatureCollection
  if (!geo.features?.length) {
    throw new Error('GeoJSON has no features')
  }

  for (const path of TARGETS) {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Payload
    const next = rematchPayload(raw, geo)
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    const codes = new Set(next.votes.map((v) => v.persona.agebCode))
    console.log(
      `rewrote ${path} — ${next.votes.length} personas, ${codes.size} distinct INEGI ageb codes`,
    )
  }
}

main()
