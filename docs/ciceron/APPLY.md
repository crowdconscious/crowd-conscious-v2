# Applying Cicéron migrations

## Production status (2026-11-12)

Already on production: **298–310** and **309** seed (Prompt 6).  
**311–316** (Prompts 7–8) and **317–320** (Prompt 9) are next / pending CTO apply.  
**308 / 309 / 310 forward bodies must not be edited** (applied).  
**Do not apply** retired `301` (auth.users seed).

## Apply order (production next)

Francisco applies; agents do not:

1. Ensure Prompt 7–8: `311` → `312` → `313` → `314` → `315` → `316` (if not already)
2. **`317_ciceron_demo_invites.sql`** — hashed invites, demo sessions, guided story table, redeem/switch RPCs
3. Verify: `317_ciceron_demo_invites.verify.sql` (`BEGIN`…`ROLLBACK`)
4. **`318_ciceron_demo_access.sql`** — RBAC/ABAC tables + `evaluate_access` / `try_access_demo` + e3 seed
5. Verify: `318_ciceron_demo_access.verify.sql`
6. **`319_ciceron_demo_ops.sql`** — freshness (no cron), reset, sales view, story RPC, event property keys
7. Verify: `319_ciceron_demo_ops.verify.sql`
8. Set env before merge/traffic: `CICERON_INVITE_PEPPER` (v1 public codes) and `CICERON_INVITE_PEPPER_V2` (runtime mints). Existing demo users must re-enter their invite code once after 317 is applied (new session cookie shape).
9. Mint non-public invites with `npx tsx scripts/ciceron/create-invite.ts --persona=admin --label="…"`.
10. **`320_ciceron_hardening_prompt9.sql`** — approve separately: revoke `set_actor` from authenticated; split `firm_onboarding` writes
11. Verify: `320_ciceron_hardening_prompt9.verify.sql`
12. Optional: `POST /api/ciceron/cron/dof` with `{ "backfillArchiveEmbeddings": true }` (Bearer `CRON_SECRET`) — on-demand only; **no Cicerón Vercel crons for demo freshness**

Rollback (branch only, reverse): `320` → `319` → `318` → `317` → `316` → …

Do **not** re-apply 308 / 309 / 310 on prod.

Fresh env Prompt 6–9 path: `308` → `310` → `309` → `311` → `312` → `313` → `314` → `315` → `316` → `317` → `318` → `319` → `320`.

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
