# Applying Cicéron migrations

## Production status (2026-11-12)

Already on production: **298–310** and **309** seed (Prompt 6).  
**308 / 309 / 310 forward bodies must not be edited** (applied).  
**Do not apply** retired `301` (auth.users seed).

## Apply order (production next)

Francisco applies; agents do not:

1. `311_ciceron_confirm_idempotent.sql` — if not yet applied
2. Verify: `311_ciceron_confirm_idempotent.verify.sql`
3. `312_ciceron_review_queue.sql` — Prompt 7 schema + RPCs (stricter delivery gate, audit outcome/policy, four-eyes, create_delivery)
4. Verify: `312_ciceron_review_queue.verify.sql`
5. `313_ciceron_review_seed.sql` — demo review tasks (Datos de demostración)
6. Verify: `313_ciceron_review_seed.verify.sql`
7. Optional: `POST /api/ciceron/cron/dof` with `{ "backfillArchiveEmbeddings": true }` (Bearer `CRON_SECRET`)

Rollback (branch only, reverse order): `313_…rollback.sql` then `312_…rollback.sql` (312 restores pre-Prompt-7 `deliveries_tier2_gate`).

Do **not** re-apply 308 / 309 / 310 on prod.

Fresh env Prompt 6–7 path: `308` → `310` → `309` → `311` → `312` → `313`.

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
10. `306` → `307` → `308` → `310` → `309` → `311` → `312` → `313`

Rollback (branch only): `298_ciceron.rollback.sql` (drops schema; does not touch civic `auth.users` for Cicéron — none are created by 302).

### Retired 301

See `.deprecated/ciceron-seed-auth-users/`. Never re-apply on the Crowd Conscious production DB.

### Storage note (300)

`300_ciceron_storage.sql` creates the private Storage bucket `ciceron` with firm-prefixed object paths (`{firm_id}/…`). It does **not** run `COMMENT ON TABLE storage.buckets`. Bucket purpose is documented on `ciceron.storage_firm_id` instead.

### Verify design (302)

Personas are simulated with `ciceron.set_actor(uuid)` / `request.jwt.claim.sub` — **no** `auth.users` rows. Checks still cover: cross-tenant blocked, `search_chunks` firm wall, pasante matter wall, tier-2 delivery blocked, audit append-only, RLS FORCE, search_path pins.
