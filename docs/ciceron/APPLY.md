# Applying Cicéron migrations

## Production status (2026-11-10)

Already on production: **298, 299, 300, 302, 303**, plus manual **`ciceron_revoke_anon_definer`** (repo file `304_ciceron_revoke_anon_definer.sql`). Schema `ciceron` is exposed in the Data API.  
**Do not apply** retired `301` (auth.users seed).

## Apply order (production next — Prompt 5)

Already on prod through **306** (classify/match) after Prompt 4. Next (Francisco applies; agents do not):

1. `307_ciceron_research.sql` — `research_queries`, `firm_ai_budgets`, `search_chunks_as_actor`, research prompt_versions
2. Verify: `307_ciceron_research.verify.sql`
3. Rollback (branch only): `307_ciceron_research.rollback.sql`

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
