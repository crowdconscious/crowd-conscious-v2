-- 255_express_oficios.sql
-- Workstream D (Señal Express, §7.1) — one row per generated oficio.
--
-- RLS pattern (CC_BUILD_CONTEXT.md §1.2): new feature tables get RLS ENABLED
-- with NO policies. All access goes through the service-role API routes
-- (app/api/senal-express/draft + confirm) using createAdminClient(), which
-- bypasses RLS. There is NO public read path for this table — an oficio's
-- artefacts are handed back to the caller directly (draft JSON + a signed PDF
-- URL) at generation time. We still enable RLS (zero policies) so a leaked
-- anon/authenticated key cannot read drafts.
--
-- `signal_id` uses ON DELETE SET NULL: the oficio is an artefact that outlives
-- the published señal, so removing a citizen_signals row must not cascade-delete
-- the historical oficio record.
--
-- AFTER APPLYING THIS MIGRATION (owner):
--   1. Run `supabase gen types typescript ...` against the branch DB, then
--      SURGICALLY inject ONLY the generated `express_oficios` Tables block into
--      the hand-tightened `types/database.ts` (CLAUDE.md — NEVER blind-regen the
--      whole file; that reverts ~50 curated narrowings).
--   2. Once injected, the local `ExpressOficioRow` interface + `as unknown as`
--      casts in `lib/senal-express/db.ts` can be dropped in favour of the
--      generated row types (see the TODO in that file).
--   Until then, Señal Express reaches this table through the UNTYPED admin
--   client (createAdminClient has no Database generic), mirroring how
--   lib/simulation/run.ts handled untyped access before its types were injected.

create table express_oficios (
  id uuid primary key default gen_random_uuid(),
  -- ON DELETE SET NULL: keep the oficio artefact even if the señal is removed.
  signal_id uuid references citizen_signals(id) on delete set null,
  user_id uuid references auth.users(id),
  device_id text,
  alcaldia text not null,
  category text not null,                        -- banqueta|luminaria|arbol|bache|basura|agua|otro
  input_sentence text not null,
  draft jsonb not null,                          -- {asunto, cuerpo_parrafos[], peticion, categoria_normalizada}
  pdf_path text,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now()
);

create index on express_oficios (device_id, created_at);
create index on express_oficios (user_id, created_at);
create index on express_oficios (signal_id);

-- RLS enabled, no policies: service-role only. No grants to anon/authenticated.
alter table express_oficios enable row level security;
