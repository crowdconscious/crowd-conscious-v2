# Applying Cicéron migrations

## Production status (2026-11-10)

Already on production: **298, 299, 300, 302, 303**, plus manual **`ciceron_revoke_anon_definer`** (repo file `304_ciceron_revoke_anon_definer.sql`). Schema `ciceron` is exposed in the Data API.  
**Do not apply** retired `301` (auth.users seed).

## Apply order (production next — Prompt 6)

Already on prod through **307** (research) after Prompt 5 (confirm on your side). Next (Francisco applies; agents do not):

1. `308_ciceron_expedientes.sql` — deadline rules, reminders, saved views, M365 sim tables, notify drafts, deadline/case_event columns
2. Verify: `308_ciceron_expedientes.verify.sql`
3. `309_ciceron_expedientes_seed.sql` — sample rules, archive docs/chunks, Outlook calendar, reminders (`is_sample`)
4. Rollback (branch only): `309_…rollback.sql` then `308_…rollback.sql`

If **307** is not yet on prod, apply it first (see prior Prompt 5 notes), then 308 → 309.

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

Rollback (branch only): `298_ciceron.rollback.sql` (drops schema; does not touch civic `auth.users` for Cicéron — none are created by 302).

### Retired 301

See `.deprecated/ciceron-seed-auth-users/`. Never re-apply on the Crowd Conscious production DB.

### Storage note (300)

`300_ciceron_storage.sql` creates the private Storage bucket `ciceron` with firm-prefixed object paths (`{firm_id}/…`). It does **not** run `COMMENT ON TABLE storage.buckets`. Bucket purpose is documented on `ciceron.storage_firm_id` instead.

### Verify design (302)

Personas are simulated with `ciceron.set_actor(uuid)` / `request.jwt.claim.sub` — **no** `auth.users` rows. Checks still cover: cross-tenant blocked, `search_chunks` firm wall, pasante matter wall, tier-2 delivery blocked, audit append-only, RLS FORCE, search_path pins.
