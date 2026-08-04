-- 252_simulation_personas.sql
-- Workstream B (Pulse Simulation) — B1 data model, table 1 of 3.
--
-- RLS pattern (CC_BUILD_CONTEXT.md §1.2): new feature tables get RLS ENABLED
-- with NO public/permissive policies. All access goes through API routes using
-- the Supabase service-role client (createAdminClient), which bypasses RLS.
-- The ONLY public read path for simulation data is the revealed_simulation_runs
-- view created in migration 254 (§5.2) — never these raw tables. We still
-- enable RLS (with zero policies) so a leaked anon/authenticated key cannot
-- SELECT synthetic panel data directly.
--
-- Persona-set versions are immutable: NEVER mutate an existing `version`;
-- improvements ship as a new version (e.g. 'cdmx-v2') with a change note.

create table simulation_personas (
  id uuid primary key default gen_random_uuid(),
  version text not null,                    -- persona-set version, e.g. 'cdmx-v1'; NEVER mutate a version
  alcaldia text not null,
  colonia text,
  age int not null,
  gender text not null,
  education text not null,                  -- primaria/secundaria/prepa/licenciatura/posgrado
  occupation text not null,
  income_band text not null,                -- AMAI-style: A/B, C+, C, C-, D+, D/E
  household text,
  transport_mode text,
  media_diet text[],
  values_profile jsonb,                     -- {seguridad:0.8, vivienda:…, movilidad:…, medio_ambiente:…, economia:…, cultura:…}
  persona_narrative text not null,          -- 2-3 sentences of CONCRETE life, used in prompt
  created_at timestamptz default now()
);
create index on simulation_personas (version, alcaldia);

-- RLS enabled, no policies: service-role only. No grants to anon/authenticated.
alter table simulation_personas enable row level security;
