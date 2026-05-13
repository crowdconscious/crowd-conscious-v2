/**
 * Seed Citizen Signal targets for the CDMX pilot.
 *
 * Idempotent: upserts by `slug`. Re-running will refresh display_name,
 * target_kind, notification_email, and metadata on existing rows but will
 * NOT delete rows that have been onboarded outside this seed (admin UI).
 *
 * Run:
 *   npx tsx scripts/seed-citizen-targets-cdmx.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * in .env.local (or exported in the shell).
 *
 * Requires migration 219_citizen_signals_mvp to be applied first.
 *
 * Notification emails below are placeholders (`avisos+slug@crowdconscious.app`).
 * Replace with real contact addresses through the admin UI before flipping
 * SIGNALS_ENABLED on for production — Stage 1 cron will email the value stored
 * here verbatim.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local'), override: true })

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
  process.exit(1)
}

import { createAdminClient } from '../lib/supabase-admin'

type SeedTarget = {
  slug: string
  display_name: string
  target_kind: 'municipality' | 'institution'
  notification_email: string | null
  metadata?: Record<string, unknown>
}

// The 16 alcaldías de la Ciudad de México + a starter set of institutions
// most likely to receive Signal traffic in the pilot. Add more through the
// admin UI; this seed is only for the day-zero list.
const TARGETS: SeedTarget[] = [
  // ── Alcaldías (municipalities) ────────────────────────────────────────────
  { slug: 'alcaldia-alvaro-obregon',  display_name: 'Alcaldía Álvaro Obregón',  target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-azcapotzalco',    display_name: 'Alcaldía Azcapotzalco',    target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-benito-juarez',   display_name: 'Alcaldía Benito Juárez',   target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-coyoacan',        display_name: 'Alcaldía Coyoacán',        target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-cuajimalpa',      display_name: 'Alcaldía Cuajimalpa de Morelos', target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-cuauhtemoc',      display_name: 'Alcaldía Cuauhtémoc',      target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-gustavo-a-madero', display_name: 'Alcaldía Gustavo A. Madero', target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-iztacalco',       display_name: 'Alcaldía Iztacalco',       target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-iztapalapa',      display_name: 'Alcaldía Iztapalapa',      target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-magdalena-contreras', display_name: 'Alcaldía La Magdalena Contreras', target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-miguel-hidalgo',  display_name: 'Alcaldía Miguel Hidalgo',  target_kind: 'municipality', notification_email: null, metadata: { pilot: true } },
  { slug: 'alcaldia-milpa-alta',      display_name: 'Alcaldía Milpa Alta',      target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-tlahuac',         display_name: 'Alcaldía Tláhuac',         target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-tlalpan',         display_name: 'Alcaldía Tlalpan',         target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-venustiano-carranza', display_name: 'Alcaldía Venustiano Carranza', target_kind: 'municipality', notification_email: null },
  { slug: 'alcaldia-xochimilco',      display_name: 'Alcaldía Xochimilco',      target_kind: 'municipality', notification_email: null },

  // ── Institutions (city-wide bodies likely to receive Signals) ────────────
  { slug: 'sedema-cdmx',              display_name: 'Secretaría del Medio Ambiente (SEDEMA)', target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'environment' } },
  { slug: 'semovi-cdmx',              display_name: 'Secretaría de Movilidad (SEMOVI)',       target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'mobility' } },
  { slug: 'sobse-cdmx',               display_name: 'Secretaría de Obras y Servicios',        target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'infrastructure' } },
  { slug: 'sapci-cdmx',               display_name: 'Sistema de Aguas de la Ciudad de México (SACMEX)', target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'water' } },
  { slug: 'metro-cdmx',               display_name: 'Sistema de Transporte Colectivo Metro',  target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'transit' } },
  { slug: 'metrobus-cdmx',            display_name: 'Metrobús CDMX',                          target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'transit' } },
  { slug: 'ssc-cdmx',                 display_name: 'Secretaría de Seguridad Ciudadana',      target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'safety' } },
  { slug: 'cdhcdmx',                  display_name: 'Comisión de Derechos Humanos de la CDMX', target_kind: 'institution', notification_email: null, metadata: { scope: 'city_wide', topic: 'rights' } },
]

async function main() {
  const admin = createAdminClient()

  console.log(`[seed-citizen-targets-cdmx] Upserting ${TARGETS.length} targets…`)

  let inserted = 0
  let updated = 0
  let errors = 0

  for (const target of TARGETS) {
    const { data: existing } = await admin
      .from('citizen_targets')
      .select('id, slug')
      .eq('slug', target.slug)
      .maybeSingle()

    const payload = {
      slug: target.slug,
      display_name: target.display_name,
      target_kind: target.target_kind,
      notification_email: target.notification_email,
      metadata: target.metadata ?? {},
    }

    if (existing) {
      const { error } = await admin
        .from('citizen_targets')
        .update(payload)
        .eq('id', existing.id)
      if (error) {
        console.error(`  ✗ update ${target.slug}: ${error.message}`)
        errors++
      } else {
        console.log(`  ✓ updated ${target.slug}`)
        updated++
      }
      continue
    }

    const { error } = await admin
      .from('citizen_targets')
      .insert(payload)
    if (error) {
      console.error(`  ✗ insert ${target.slug}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✓ inserted ${target.slug}`)
      inserted++
    }
  }

  console.log(
    `[seed-citizen-targets-cdmx] done. inserted=${inserted} updated=${updated} errors=${errors}`
  )

  if (errors > 0) process.exit(1)
}

main().catch((err) => {
  console.error('[seed-citizen-targets-cdmx] fatal:', err)
  process.exit(1)
})
