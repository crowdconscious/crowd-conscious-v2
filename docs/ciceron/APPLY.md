# Applying Cicéron migrations

## Production status (2026-11-10)

Already on production: **298, 299, 300**.  
**Do not apply** retired `301` (auth.users seed) — it would fire `on_auth_user_created` → Crowd Conscious `profiles`.

## Apply order (production next)

1. `supabase/migrations/302_ciceron_seed_prod_safe.sql` — demo personas + firm/client/matter/case seed (**no** `auth.users`)
2. `supabase/migrations/303_ciceron_function_search_path.sql` — advisor fix: `search_path` on `set_updated_at`, `audit_events_immutable`, `storage_firm_id`

Then expose schema `ciceron` under Project Settings → API → Exposed schemas (if not already).

Verify: run `supabase/migrations/302_ciceron.verify.sql` and confirm every `OK:` notice (including “no auth.users demo emails” and search_path pins).

## Fresh environment (branch / new project)

1. `298_ciceron_foundation.sql`
2. `299_ciceron_security.sql`
3. `300_ciceron_storage.sql`
4. `302_ciceron_seed_prod_safe.sql` ← replaces retired 301
5. `303_ciceron_function_search_path.sql`
6. Expose schema `ciceron`
7. Run `302_ciceron.verify.sql`

Rollback (branch only): `298_ciceron.rollback.sql` (drops schema; does not touch civic `auth.users` for Cicéron — none are created by 302).

### Retired 301

See `.deprecated/ciceron-seed-auth-users/`. Never re-apply on the Crowd Conscious production DB.

### Storage note (300)

`300_ciceron_storage.sql` creates the private Storage bucket `ciceron` with firm-prefixed object paths (`{firm_id}/…`). It does **not** run `COMMENT ON TABLE storage.buckets`. Bucket purpose is documented on `ciceron.storage_firm_id` instead.

### Verify design (302)

Personas are simulated with `ciceron.set_actor(uuid)` / `request.jwt.claim.sub` — **no** `auth.users` rows. Checks still cover: cross-tenant blocked, `search_chunks` firm wall, pasante matter wall, tier-2 delivery blocked, audit append-only, RLS FORCE, search_path pins.
