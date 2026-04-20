/**
 * Seed the Conscious Fund with real verified causes.
 *
 * Idempotent: upserts by `slug`. Safe to run repeatedly — re-running will
 * not duplicate rows and will not overwrite the `verified_at` timestamp
 * of an already-verified cause.
 *
 * Run:
 *   npx tsx scripts/seed-causes-v2.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Requires migration 205_fund_causes_v2 to be applied first.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), override: true })

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  process.exit(1)
}

import { createAdminClient } from '../lib/supabase-admin'

type SeedCause = {
  slug: string
  name: string
  organization: string
  category:
    | 'water'
    | 'education'
    | 'environment'
    | 'social_justice'
    | 'health'
    | 'mobility'
    | 'housing'
    | 'hunger'
    | 'culture'
    | 'emergency'
    | 'other'
  short_description: string
  description: string
  website_url: string | null
  logo_url: string | null
  cover_image_url: string | null
  instagram_handle: string | null
  city: string | null
  verified: boolean
  active: boolean
}

const REAL_CAUSES: SeedCause[] = [
  {
    slug: 'aqui-nadie-se-rinde',
    name: 'Aquí Nadie Se Rinde',
    organization: 'Aquí Nadie Se Rinde A.C.',
    category: 'health',
    short_description:
      'Prevención del suicidio y acompañamiento en salud mental en México.',
    description:
      'Organización mexicana dedicada a la prevención del suicidio y el ' +
      'acompañamiento de personas con ideación suicida, depresión y ansiedad. ' +
      'Ofrecen líneas de crisis, talleres y material psicoeducativo gratuito ' +
      'para familias, escuelas y empresas. Su trabajo une clínica, activismo y ' +
      'cultura: la salud mental deja de ser un tema tabú y se convierte en un ' +
      'bien público que Crowd Conscious puede ayudar a financiar.',
    website_url: 'https://aquinadieserinde.org.mx/',
    logo_url: null, // upload from admin after verification
    cover_image_url: null,
    instagram_handle: 'aquinadieserinde',
    city: 'Ciudad de México',
    verified: true,
    active: true,
  },
  {
    slug: 'ciclica',
    name: 'Cíclica',
    organization: 'Cíclica Movilidad',
    category: 'mobility',
    short_description:
      'Investigación y diseño de políticas de movilidad sustentable en CDMX.',
    description:
      'Consultora de movilidad sostenible en México. Investigan, diseñan y ' +
      'evalúan políticas de transporte público, ciclismo urbano y ' +
      'peatonalización. Aliados naturales del enfoque de Conscious Pulse: ' +
      'decisiones basadas en data ciudadana, no en opinión editorial. Un ciclo ' +
      'del Fondo Consciente puede financiar un estudio ciudadano o una ' +
      'intervención piloto en una alcaldía de CDMX.',
    website_url: 'https://www.ciclica.com.mx/',
    logo_url: null,
    cover_image_url: null,
    instagram_handle: 'ciclica_movilidad',
    city: 'Ciudad de México',
    verified: true,
    active: true,
  },
]

async function main() {
  const admin = createAdminClient()

  console.log(`[seed-causes-v2] Upserting ${REAL_CAUSES.length} causes…`)

  for (const cause of REAL_CAUSES) {
    // Check if a row with this slug already exists so we don't overwrite
    // verification metadata set via the admin UI. If it exists, we only
    // update the editorial copy fields; we leave `verified_at`/`verified_by`
    // alone.
    const { data: existing } = await admin
      .from('fund_causes')
      .select('id, slug, verified, verified_at, verified_by')
      .eq('slug', cause.slug)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from('fund_causes')
        .update({
          name: cause.name,
          organization: cause.organization,
          category: cause.category,
          short_description: cause.short_description,
          description: cause.description,
          website_url: cause.website_url,
          instagram_handle: cause.instagram_handle,
          city: cause.city,
          active: cause.active,
        })
        .eq('id', existing.id)
      if (error) {
        console.error(`  ✗ update ${cause.slug}: ${error.message}`)
      } else {
        console.log(
          `  ✓ updated ${cause.slug} (verified=${existing.verified ?? false})`
        )
      }
      continue
    }

    const insert: Record<string, unknown> = {
      slug: cause.slug,
      name: cause.name,
      organization: cause.organization,
      category: cause.category,
      short_description: cause.short_description,
      description: cause.description,
      website_url: cause.website_url,
      instagram_handle: cause.instagram_handle,
      city: cause.city,
      active: cause.active,
      verified: cause.verified,
    }
    if (cause.verified) insert.verified_at = new Date().toISOString()

    const { error } = await admin.from('fund_causes').insert(insert)
    if (error) {
      console.error(`  ✗ insert ${cause.slug}: ${error.message}`)
    } else {
      console.log(`  ✓ inserted ${cause.slug}`)
    }
  }

  console.log('\n[seed-causes-v2] Done.')
  console.log('  Next step: upload logos from /predictions/admin/causes')
  console.log('  Verify at: /fund/causes/aqui-nadie-se-rinde, /fund/causes/ciclica')
}

main().catch((err) => {
  console.error('[seed-causes-v2] fatal:', err)
  process.exit(1)
})
