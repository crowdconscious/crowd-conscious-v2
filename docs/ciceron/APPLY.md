# Applying Cicéron migrations

## Production status (2026-11-12)

Already on production: **298–307**, plus **308** (Expedientes schema) applied on `821deb14`.  
**309 failed and rolled back** (`saved_views.is_sample` missing — 306 already owned `ciceron.saved_views`, so 308’s `CREATE TABLE IF NOT EXISTS` skipped).  
**Do not apply** retired `301` (auth.users seed).

## Apply order (production next — Prompt 6 fixups)

Francisco applies; agents do not. Order is intentional (310 before 309):

1. `310_ciceron_expedientes_fixups.sql` — `saved_views.is_sample`, room CHECK (`monitor-dof`|`expedientes`|`calendario`), session-actor bind on gates, plus `confirm_deadline` / `approve_client_notify` RPCs (set_actor + update; service_role only)
2. Verify: `310_ciceron_expedientes_fixups.verify.sql`
3. `309_ciceron_expedientes_seed.sql` — sample rules, archive docs/chunks (`embedding`/`embedding_model` NULL), Outlook calendar, reminders, saved view
4. Optional: `POST /api/ciceron/cron/dof` with `{ "backfillArchiveEmbeddings": true }` (Bearer `CRON_SECRET`) to embed archive chunks
5. Rollback (branch only): `309_…rollback.sql` → `310_…rollback.sql` → (only if fully reversing Prompt 6) `308_…rollback.sql`

**Do not** re-apply 308 forward on prod (already applied). 308 rollback never drops `ciceron.saved_views` (306 table).

If **308** is not yet on a fresh env, apply `308` → verify → `310` → `309`.

Embeddings need **Vercel AI Gateway** enabled for the project (OIDC on deploy). Locally optional `AI_GATEWAY_API_KEY`. Anthropic keys unchanged for rewrite/answer.

Backlog classify/match (if needed):

```bash
npx tsx scripts/ciceron-dof-classify-match.ts --all-pending --limit=8
```

Research eval (offline; citation validity must be 100%):

```bash
npx tsx scripts/ciceron-research-eval.ts
```

## Fresh environment (branch / new project)

1. `298_ciceron_foundation.sql`
2. `299_ciceron_security.sql`
3. `300_ciceron_storage.sql`
4. `302_ciceron_seed_prod_safe.sql` ← replaces retired 301
5. `303_ciceron_function_search_path.sql`
6. `304_ciceron_revoke_anon_definer.sql`
7. `305_ciceron_dof_pipeline.sql`
8. Expose schema `ciceron`
9. Run `302_ciceron.verify.sql` then `305_ciceron_dof_pipeline.verify.sql`
10. `306` → `307` → `308` → `310` → `309` (note: **310 before 309**)

Rollback (branch only): `298_ciceron.rollback.sql` (drops schema; does not touch civic `auth.users` for Cicéron — none are created by 302).

### Retired 301

See `.deprecated/ciceron-seed-auth-users/`. Never re-apply on the Crowd Conscious production DB.

### Storage note (300)

`300_ciceron_storage.sql` creates the private Storage bucket `ciceron` with firm-prefixed object paths (`{firm_id}/…`). It does **not** run `COMMENT ON TABLE storage.buckets`. Bucket purpose is documented on `ciceron.storage_firm_id` instead.

### Verify design (302)

Personas are simulated with `ciceron.set_actor(uuid)` / `request.jwt.claim.sub` — **no** `auth.users` rows. Checks still cover: cross-tenant blocked, `search_chunks` firm wall, pasante matter wall, tier-2 delivery blocked, audit append-only, RLS FORCE, search_path pins.
