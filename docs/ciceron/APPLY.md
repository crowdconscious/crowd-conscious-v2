# Applying Prompt 1 on a Supabase branch

1. Create a preview branch from project `ottixfzdytnzxquzrrcf` (or use an existing test branch).
2. In the branch SQL editor, run **in order**:
   1. `supabase/migrations/298_ciceron_foundation.sql`
   2. `supabase/migrations/299_ciceron_security.sql`
   3. `supabase/migrations/300_ciceron_storage.sql`
   4. `supabase/migrations/301_ciceron_seed.sql`
3. Expose schema `ciceron` under Project Settings → API → Exposed schemas.
4. Run `supabase/migrations/298_ciceron.verify.sql` and confirm every `OK:` notice.
5. Only then apply the same four files to production.

Rollback (branch only): `supabase/migrations/298_ciceron.rollback.sql`.

Seed passwords (`ciceron-demo-only`) and `@ciceron.demo.invalid` emails are fictional **Datos de demostración** — not for production login UX (invite codes come in Prompt 9).

### Storage note (300)
`300_ciceron_storage.sql` creates the private Storage bucket `ciceron` with firm-prefixed object paths (`{firm_id}/…`). It does **not** run `COMMENT ON TABLE storage.buckets` — that table is owned by `supabase_storage_admin`, so `postgres` gets `42501`. Bucket purpose is documented on `ciceron.storage_firm_id` instead. If bucket insert also fails for ownership, create the `ciceron` bucket in the Storage UI (private, 50 MiB) and re-run only the function + policies section.
