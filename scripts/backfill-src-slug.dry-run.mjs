/**
 * DRY RUN ONLY. Proposes a Lugar Consciente src_slug (qr_<slug>) for every
 * conscious_location that has none, and reports collisions and how many past
 * votes already carry that src. Writes NOTHING: it prints the proposal and the
 * SQL a human can review and run later (after migration 289).
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-src-slug.dry-run.mjs
 * There is deliberately no --apply flag.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

// Same rule as lib/lugar/rules.ts srcSlugFor().
const srcSlugFor = (slug) => {
  const clean = slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  return `qr_${clean}`.slice(0, 40).replace(/[-._]+$/, '')
}

const { data: locs, error } = await db.from('conscious_locations').select('id, slug, name, status, src_slug').order('slug')
if (error) { console.error(error.message); process.exit(1) }
const taken = new Set(locs.filter((l) => l.src_slug).map((l) => l.src_slug))
const rows = []
for (const l of locs) {
  if (l.src_slug) continue
  let s = srcSlugFor(l.slug), i = 1
  while (taken.has(s)) s = `${srcSlugFor(l.slug).slice(0, 37)}-${++i}`
  taken.add(s)
  const { count } = await db.from('market_votes').select('id', { count: 'exact', head: true }).eq('src', s)
  rows.push({ slug: l.slug, status: l.status, proposed: s, collision: i > 1, existing_votes_with_src: count ?? 0 })
}
console.table(rows)
console.log(`\n-- ${rows.length} proposals. Review, then run by hand inside a transaction:\nBEGIN;`)
for (const r of rows) console.log(`UPDATE public.conscious_locations SET src_slug = '${r.proposed}' WHERE slug = '${r.slug.replaceAll("'", "''")}' AND src_slug IS NULL;`)
console.log('-- verify: SELECT slug, src_slug FROM public.conscious_locations ORDER BY slug;\n-- then COMMIT; (or ROLLBACK;)')
console.log('\nDRY RUN: nothing was written.')
