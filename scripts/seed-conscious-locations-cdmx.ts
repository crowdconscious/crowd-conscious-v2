/**
 * Seed CDMX alcaldías into the `conscious_locations` table.
 *
 * The Citizen Signals compose wizard (`/signals/nueva`, Step 3 "Lugar") shows
 * `conscious_locations` filtered to CDMX. Without rows in this table the
 * searchable dropdown renders "Sin resultados" and the wizard cannot advance
 * past step 3. This seed gives the pilot a day-zero list of locations: the
 * 16 alcaldías de la Ciudad de México.
 *
 * Idempotent: upserts by `slug`. Re-running will refresh `name`, `city`,
 * `latitude`, `longitude`, and `status` on existing rows but will NEVER
 * delete or overwrite admin-curated metadata (`description`, `why_conscious`,
 * `sponsor_account_id`, etc.).
 *
 * Run:
 *   npx tsx scripts/seed-conscious-locations-cdmx.ts
 *
 * Requires (in .env.local or exported in the shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run order: this seed is independent of, but complementary to,
 * `seed-citizen-targets-cdmx.ts`. After both have run an admin can link each
 * `citizen_targets` row (alcaldía) to its matching `conscious_locations` row
 * through the admin UI; the Signals API does not require the link to exist.
 *
 * Lat/lng values are approximate geographic centroids of each alcaldía and
 * are intended only as map-centering hints. They are NOT authoritative
 * polygon data; pilot UI uses them solely to anchor the location card.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), override: true })

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  process.exit(1)
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local')
  process.exit(1)
}

import { createAdminClient } from '../lib/supabase-admin'

type ConsciousLocationCategory =
  | 'restaurant'
  | 'bar'
  | 'cafe'
  | 'hotel'
  | 'coworking'
  | 'store'
  | 'brand'
  | 'influencer'
  | 'festival'
  | 'artist'
  | 'gallery'
  | 'club'
  | 'market'
  | 'food_truck'
  | 'mezcaleria'
  | 'rooftop'
  | 'gym'
  | 'spa'
  | 'nonprofit'
  | 'venue'
  | 'other'

type ConsciousLocationStatus =
  | 'pending'
  | 'active'
  | 'under_review'
  | 'suspended'
  | 'revoked'

type SeedLocation = {
  slug: string
  name: string
  neighborhood: string | null
  latitude: number
  longitude: number
}

// Approximate centroids of each alcaldía (decimal degrees). Sourced from
// well-known GIS references; precise to ~1 km, which is plenty for the
// "where does this signal apply?" map pin in the compose wizard.
const ALCALDIAS: SeedLocation[] = [
  { slug: 'cdmx-alvaro-obregon',        name: 'Álvaro Obregón',         neighborhood: null, latitude: 19.3578, longitude: -99.2058 },
  { slug: 'cdmx-azcapotzalco',          name: 'Azcapotzalco',           neighborhood: null, latitude: 19.4849, longitude: -99.1842 },
  { slug: 'cdmx-benito-juarez',         name: 'Benito Juárez',          neighborhood: null, latitude: 19.3725, longitude: -99.1565 },
  { slug: 'cdmx-coyoacan',              name: 'Coyoacán',               neighborhood: null, latitude: 19.3500, longitude: -99.1620 },
  { slug: 'cdmx-cuajimalpa',            name: 'Cuajimalpa de Morelos',  neighborhood: null, latitude: 19.3568, longitude: -99.2935 },
  { slug: 'cdmx-cuauhtemoc',            name: 'Cuauhtémoc',             neighborhood: null, latitude: 19.4404, longitude: -99.1543 },
  { slug: 'cdmx-gustavo-a-madero',      name: 'Gustavo A. Madero',      neighborhood: null, latitude: 19.4920, longitude: -99.1138 },
  { slug: 'cdmx-iztacalco',             name: 'Iztacalco',              neighborhood: null, latitude: 19.3996, longitude: -99.0975 },
  { slug: 'cdmx-iztapalapa',            name: 'Iztapalapa',             neighborhood: null, latitude: 19.3450, longitude: -99.0680 },
  { slug: 'cdmx-magdalena-contreras',   name: 'La Magdalena Contreras', neighborhood: null, latitude: 19.3066, longitude: -99.2419 },
  { slug: 'cdmx-miguel-hidalgo',        name: 'Miguel Hidalgo',         neighborhood: null, latitude: 19.4150, longitude: -99.1880 },
  { slug: 'cdmx-milpa-alta',            name: 'Milpa Alta',             neighborhood: null, latitude: 19.1923, longitude: -99.0231 },
  { slug: 'cdmx-tlahuac',               name: 'Tláhuac',                neighborhood: null, latitude: 19.2786, longitude: -99.0040 },
  { slug: 'cdmx-tlalpan',               name: 'Tlalpan',                neighborhood: null, latitude: 19.2700, longitude: -99.1635 },
  { slug: 'cdmx-venustiano-carranza',   name: 'Venustiano Carranza',    neighborhood: null, latitude: 19.4358, longitude: -99.1066 },
  { slug: 'cdmx-xochimilco',            name: 'Xochimilco',             neighborhood: null, latitude: 19.2611, longitude: -99.1031 },
]

const CITY = 'Ciudad de México'
const COUNTRY_TAG = 'México'
const CATEGORY: ConsciousLocationCategory = 'other'
const STATUS: ConsciousLocationStatus = 'active'

async function main() {
  const admin = createAdminClient()

  console.log(
    `[seed-conscious-locations-cdmx] Upserting ${ALCALDIAS.length} alcaldías…`
  )

  let inserted = 0
  let updated = 0
  let errors = 0

  for (const loc of ALCALDIAS) {
    const { data: existing, error: selectError } = await admin
      .from('conscious_locations')
      .select('id, slug')
      .eq('slug', loc.slug)
      .maybeSingle()

    if (selectError) {
      console.error(`  ✗ lookup ${loc.slug}: ${selectError.message}`)
      errors++
      continue
    }

    // Existing rows: refresh only the safe, seed-owned fields. Anything an
    // admin may have curated (description, sponsor_account_id, etc.) is left
    // untouched.
    const updatePayload = {
      name: loc.name,
      city: CITY,
      neighborhood: loc.neighborhood,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: STATUS,
      metadata: {
        country: COUNTRY_TAG,
        seeded_by: 'seed-conscious-locations-cdmx',
        kind: 'alcaldia',
      } as Record<string, unknown>,
    }

    if (existing) {
      const { error } = await admin
        .from('conscious_locations')
        .update(updatePayload)
        .eq('id', existing.id)
      if (error) {
        console.error(`  ✗ update ${loc.slug}: ${error.message}`)
        errors++
      } else {
        console.log(`  ✓ updated ${loc.slug}`)
        updated++
      }
      continue
    }

    const insertPayload = {
      slug: loc.slug,
      name: loc.name,
      category: CATEGORY,
      city: CITY,
      neighborhood: loc.neighborhood,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: STATUS,
      metadata: {
        country: COUNTRY_TAG,
        seeded_by: 'seed-conscious-locations-cdmx',
        kind: 'alcaldia',
      } as Record<string, unknown>,
    }

    const { error } = await admin
      .from('conscious_locations')
      .insert(insertPayload)
    if (error) {
      console.error(`  ✗ insert ${loc.slug}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✓ inserted ${loc.slug}`)
      inserted++
    }
  }

  console.log(
    `[seed-conscious-locations-cdmx] done. inserted=${inserted} updated=${updated} errors=${errors}`
  )

  if (errors > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[seed-conscious-locations-cdmx] fatal:', err)
  process.exit(1)
})
