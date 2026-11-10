-- 302_ciceron_seed_prod_safe.sql
-- Prod-safe Cicéron demo seed: NO auth.users / auth.identities inserts.
-- Demo actors live in ciceron.demo_personas; memberships.user_id points at those
-- UUIDs (FK to auth.users dropped). Invite cookie resolves a persona server-side.
-- Replaces retired 301 (.deprecated/ciceron-seed-auth-users/).
-- Depends on 298–300. Idempotent where practical.

-- ---------------------------------------------------------------------------
-- Actor identity: JWT sub OR ciceron.actor_id GUC (verify / service harness)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
    NULLIF(current_setting('ciceron.actor_id', true), '')::uuid
  );
$$;

COMMENT ON FUNCTION ciceron.current_actor_id() IS
  'Demo/prod actor: request.jwt.claim.sub or ciceron.actor_id GUC. Not required to exist in auth.users.';

CREATE OR REPLACE FUNCTION ciceron.set_actor(p_actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
BEGIN
  IF p_actor IS NULL THEN
    RAISE EXCEPTION 'actor required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ciceron.memberships m WHERE m.user_id = p_actor) THEN
    RAISE EXCEPTION 'unknown ciceron actor';
  END IF;
  PERFORM set_config('ciceron.actor_id', p_actor::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_actor::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END;
$$;

COMMENT ON FUNCTION ciceron.set_actor(uuid) IS
  'Test/harness helper: sets transaction-local actor for RLS without auth.users.';

GRANT EXECUTE ON FUNCTION ciceron.current_actor_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.set_actor(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Drop auth.users FKs so memberships can reference demo persona UUIDs
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE ciceron.matter_members DROP CONSTRAINT IF EXISTS matter_members_user_id_fkey;
ALTER TABLE ciceron.audit_events DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;
ALTER TABLE ciceron.events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE ciceron.ai_runs DROP CONSTRAINT IF EXISTS ai_runs_user_id_fkey;

COMMENT ON COLUMN ciceron.memberships.user_id IS
  'Actor id: auth.users id when linked, or ciceron.demo_personas.id for Datos de demostración.';

-- ---------------------------------------------------------------------------
-- Re-point helpers from auth.uid() to ciceron.current_actor_id()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.firms_of_current_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT m.firm_id
  FROM ciceron.memberships m
  WHERE m.user_id = ciceron.current_actor_id();
$$;

CREATE OR REPLACE FUNCTION ciceron.is_ciceron_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ciceron.memberships m WHERE m.user_id = ciceron.current_actor_id()
  );
$$;

CREATE OR REPLACE FUNCTION ciceron.is_matter_member(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ciceron.matters m
    JOIN ciceron.memberships ms
      ON ms.firm_id = m.firm_id AND ms.user_id = ciceron.current_actor_id()
    WHERE m.id = p_matter_id
      AND (
        ms.role IN ('socio', 'asociado', 'admin')
        OR EXISTS (
          SELECT 1
          FROM ciceron.matter_members mm
          WHERE mm.matter_id = m.id AND mm.user_id = ciceron.current_actor_id()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION ciceron.matter_role(p_matter_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT ms.role
  FROM ciceron.matters m
  JOIN ciceron.memberships ms
    ON ms.firm_id = m.firm_id AND ms.user_id = ciceron.current_actor_id()
  WHERE m.id = p_matter_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION ciceron.can_review_matter(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ciceron.matters m
    JOIN ciceron.memberships ms
      ON ms.firm_id = m.firm_id AND ms.user_id = ciceron.current_actor_id()
    WHERE m.id = p_matter_id
      AND ms.role IN ('socio', 'asociado', 'admin')
  )
  AND ciceron.is_matter_member(p_matter_id);
$$;

CREATE OR REPLACE FUNCTION ciceron.can_manage_firm(p_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ciceron.memberships ms
    WHERE ms.firm_id = p_firm_id
      AND ms.user_id = ciceron.current_actor_id()
      AND ms.role IN ('socio', 'asociado', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION ciceron.search_chunks(
  query_text text,
  query_embedding extensions.vector(1536),
  p_firm_id uuid,
  p_matter_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  fused_score double precision,
  fts_rank double precision,
  vector_distance double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public, extensions
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_tsquery tsquery;
BEGIN
  IF ciceron.current_actor_id() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT ciceron.is_ciceron_member() THEN
    RAISE EXCEPTION 'not a ciceron member';
  END IF;

  IF p_firm_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM ciceron.firms_of_current_user() f WHERE f = p_firm_id
     ) THEN
    RAISE EXCEPTION 'invalid or inaccessible firm_id';
  END IF;

  IF p_matter_id IS NOT NULL AND NOT ciceron.is_matter_member(p_matter_id) THEN
    RAISE EXCEPTION 'not a member of matter';
  END IF;

  IF p_matter_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM ciceron.matters m
      WHERE m.id = p_matter_id AND m.firm_id = p_firm_id
    ) THEN
      RAISE EXCEPTION 'matter does not belong to firm';
    END IF;
  END IF;

  IF query_text IS NOT NULL AND btrim(query_text) <> '' THEN
    v_tsquery := websearch_to_tsquery('spanish', query_text);
  ELSE
    v_tsquery := NULL;
  END IF;

  RETURN QUERY
  WITH accessible AS (
    SELECT
      ch.id AS cid,
      ch.text AS ctxt,
      d.id AS did,
      CASE
        WHEN v_tsquery IS NULL THEN 0::real
        ELSE ts_rank_cd(ch.search_tsv, v_tsquery)
      END AS fts_r,
      CASE
        WHEN query_embedding IS NULL OR ch.embedding IS NULL THEN NULL::double precision
        ELSE (ch.embedding <=> query_embedding)
      END AS vec_d
    FROM ciceron.chunks ch
    JOIN ciceron.document_versions dv ON dv.id = ch.version_id
    JOIN ciceron.documents d ON d.id = dv.document_id
    WHERE (d.firm_id IS NULL OR d.firm_id = p_firm_id)
  ),
  scored AS (
    SELECT
      a.cid, a.ctxt, a.did, a.fts_r, a.vec_d,
      (
        COALESCE(a.fts_r, 0)::double precision * 0.5
        + COALESCE((1.0 / (1.0 + a.vec_d))::double precision, 0) * 0.5
      ) AS fused
    FROM accessible a
    WHERE
      (v_tsquery IS NOT NULL AND a.fts_r > 0)
      OR (query_embedding IS NOT NULL AND a.vec_d IS NOT NULL)
  )
  SELECT s.cid, s.did, s.ctxt, s.fused, s.fts_r::double precision, s.vec_d
  FROM scored s
  ORDER BY s.fused DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

-- Events policies referenced auth.uid() directly — rebind to current_actor_id
DROP POLICY IF EXISTS events_select ON ciceron.events;
CREATE POLICY events_select ON ciceron.events
  FOR SELECT TO authenticated
  USING (
    (firm_id IS NULL AND user_id = ciceron.current_actor_id())
    OR (firm_id IN (SELECT ciceron.firms_of_current_user()))
  );

DROP POLICY IF EXISTS events_insert ON ciceron.events;
CREATE POLICY events_insert ON ciceron.events
  FOR INSERT TO authenticated
  WITH CHECK (
    (firm_id IS NULL AND user_id = ciceron.current_actor_id())
    OR (
      firm_id IN (SELECT ciceron.firms_of_current_user())
      AND ciceron.is_ciceron_member()
    )
  );

-- ---------------------------------------------------------------------------
-- demo_personas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.demo_personas (
  id uuid PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('socio', 'asociado', 'pasante', 'admin')),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 200),
  invite_code text NOT NULL UNIQUE CHECK (char_length(invite_code) BETWEEN 4 AND 64),
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_personas_firm_id_idx ON ciceron.demo_personas (firm_id);
CREATE INDEX IF NOT EXISTS demo_personas_invite_code_idx ON ciceron.demo_personas (invite_code);

COMMENT ON TABLE ciceron.demo_personas IS
  'Datos de demostración — Cicéron-owned actors. Never insert into auth.users.';

DROP TRIGGER IF EXISTS demo_personas_set_updated_at ON ciceron.demo_personas;
CREATE TRIGGER demo_personas_set_updated_at
  BEFORE UPDATE ON ciceron.demo_personas
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

ALTER TABLE ciceron.demo_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.demo_personas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.demo_personas FROM anon, authenticated;
GRANT SELECT ON ciceron.demo_personas TO authenticated;
GRANT ALL ON ciceron.demo_personas TO service_role;

DROP POLICY IF EXISTS demo_personas_select ON ciceron.demo_personas;
CREATE POLICY demo_personas_select ON ciceron.demo_personas
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Seed data (same fixed UUIDs as retired 301, minus auth.users)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.firms (id, name, slug, is_demo)
VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'Despacho Demo, S.C.', 'despacho-demo', true),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'Bufete Contraste, S.C.', 'bufete-contraste', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_demo = true;

INSERT INTO ciceron.demo_personas (id, firm_id, role, display_name, invite_code, is_demo) VALUES
  ('b1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'socio', 'Socia Demo Rivera', 'DESPACHO-DEMO', true),
  ('b1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'asociado', 'Asociado Demo Herrera', 'DESPACHO-ASOCIADO', true),
  ('b1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'pasante', 'Pasante Demo López', 'DESPACHO-PASANTE', true),
  ('b1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'admin', 'Admin Demo Ortega', 'DESPACHO-ADMIN', true),
  ('b1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'asociado', 'Asociada Demo Méndez', 'DESPACHO-ASOCIADO2', true),
  ('b1000000-0000-4000-8000-000000000011'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 'socio', 'Abogado Contraste Núñez', 'CONTRASTE-DEMO', true)
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      invite_code = EXCLUDED.invite_code,
      role = EXCLUDED.role,
      is_demo = true;

INSERT INTO ciceron.memberships (firm_id, user_id, role) VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000001'::uuid, 'socio'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000002'::uuid, 'asociado'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000003'::uuid, 'pasante'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000004'::uuid, 'admin'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000005'::uuid, 'asociado'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'b1000000-0000-4000-8000-000000000011'::uuid, 'socio')
ON CONFLICT (firm_id, user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO ciceron.clients (id, firm_id, display_name, external_ref, is_demo) VALUES
  ('c1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Nexora Pagos, S.A.P.I. de C.V.', 'fintech', true),
  ('c1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Distribuidora Farma Sierra, S.A. de C.V.', 'salud', true),
  ('c1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Viento del Istmo Energía, S.A.P.I. de C.V.', 'energia', true),
  ('c1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Agencia Aduanal Delta del Pacífico, S.C.', 'comercio_exterior', true),
  ('c1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Fondo Pedregal Inmuebles, S.A. de C.V.', 'inmobiliario', true),
  ('c1000000-0000-4000-8000-000000000006'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'Alimentos del Bajío Integrados, S.A. de C.V.', 'alimentos', true),
  ('c1000000-0000-4000-8000-000000000101'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 'Comercializadora Contraste Demo, S.A. de C.V.', 'aislamiento', true)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, is_demo = true;

INSERT INTO ciceron.matters (id, firm_id, client_id, title, matter_ref, is_demo) VALUES
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000001'::uuid, 'Licencia CNBV y prevención de lavado', 'DEMO-NEXORA_CNBV', true),
  ('d1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000001'::uuid, 'Contratos con instituciones de crédito', 'DEMO-NEXORA_PLD', true),
  ('d1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000002'::uuid, 'Autorizaciones COFEPRIS y cadena de frío', 'DEMO-FARMA_COFEPRIS', true),
  ('d1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000003'::uuid, 'Permisos CRE y evaluación de impacto ambiental', 'DEMO-VIENTO_CRE', true),
  ('d1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000004'::uuid, 'Clasificación arancelaria y auditorías SAT', 'DEMO-ADUANAS_SAT', true),
  ('d1000000-0000-4000-8000-000000000006'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000005'::uuid, 'Portafolio de arrendamiento CDMX', 'DEMO-FONDO_INMUEBLES', true),
  ('d1000000-0000-4000-8000-000000000007'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000006'::uuid, 'Etiquetado frontal y NOM de inocuidad', 'DEMO-ALIM_NOM', true),
  ('d1000000-0000-4000-8000-000000000008'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 'c1000000-0000-4000-8000-000000000101'::uuid, 'Asunto único de aislamiento (demo)', 'DEMO-FIRM_B_UNICO', true)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, is_demo = true;

INSERT INTO ciceron.matter_members (matter_id, user_id, role) VALUES
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000003'::uuid, 'apoyo'),
  ('d1000000-0000-4000-8000-000000000003'::uuid, 'b1000000-0000-4000-8000-000000000003'::uuid, 'apoyo'),
  ('d1000000-0000-4000-8000-000000000001'::uuid, 'b1000000-0000-4000-8000-000000000002'::uuid, 'responsable'),
  ('d1000000-0000-4000-8000-000000000008'::uuid, 'b1000000-0000-4000-8000-000000000011'::uuid, 'responsable')
ON CONFLICT (matter_id, user_id) DO NOTHING;

INSERT INTO ciceron.watch_profiles (id, client_id, subject_areas, authorities, keywords, norms_of_interest, description, embedding_model, is_demo) VALUES
  ('e1000000-0000-4000-8000-000000000001'::uuid, 'c1000000-0000-4000-8000-000000000001'::uuid, ARRAY['financiero y fintech','datos personales']::text[], ARRAY['CNBV','Banxico','UIF']::text[], ARRAY['PLD','fintech','SPEI']::text[], ARRAY['LFPIORPI']::text[],
   $$Datos de demostración. Emisora de pagos. Interesa regulación de fondos de pago electrónico, PLD y protección de datos de clientes.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000002'::uuid, 'c1000000-0000-4000-8000-000000000002'::uuid, ARRAY['salud y regulación sanitaria']::text[], ARRAY['COFEPRIS','SSA']::text[], ARRAY['farmacovigilancia','cadena de frío']::text[], ARRAY['LISSA']::text[],
   $$Datos de demostración. Distribuye medicamentos. Vigila registros sanitarios, NOM de almacenamiento y publicidad.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000003'::uuid, 'c1000000-0000-4000-8000-000000000003'::uuid, ARRAY['energía','ambiental']::text[], ARRAY['CRE','SENER','SEMARNAT']::text[], ARRAY['generación eólica','interconexión']::text[], ARRAY['LGEEPA']::text[],
   $$Datos de demostración. Parques eólicos en el Istmo. Vigila permisos de generación, impacto ambiental y CFE.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000004'::uuid, 'c1000000-0000-4000-8000-000000000004'::uuid, ARRAY['comercio exterior y aduanas']::text[], ARRAY['SAT','ANAM']::text[], ARRAY['fracción arancelaria','pedimento']::text[], ARRAY['Ley Aduanera']::text[],
   $$Datos de demostración. Despacho aduanal. Vigila reglas generales de comercio exterior y NOM de producto.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000005'::uuid, 'c1000000-0000-4000-8000-000000000005'::uuid, ARRAY['inmobiliario','financiero y fintech']::text[], ARRAY['CNBV','SEDUVI']::text[], ARRAY['arrendamiento','fideicomiso']::text[], ARRAY['Código Civil']::text[],
   $$Datos de demostración. Fondo de renta. Vigila topes de renta, fiscalidad de fideicomisos y CNBV.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000006'::uuid, 'c1000000-0000-4000-8000-000000000006'::uuid, ARRAY['salud y regulación sanitaria','laboral']::text[], ARRAY['COFEPRIS','STPS']::text[], ARRAY['etiquetado','NOM-051']::text[], ARRAY['LFNS']::text[],
   $$Datos de demostración. Alimentos procesados. Vigila etiquetado frontal, inocuidad y obligaciones laborales.$$, 'text-embedding-3-small', true),
  ('e1000000-0000-4000-8000-000000000007'::uuid, 'c1000000-0000-4000-8000-000000000101'::uuid, ARRAY['corporativo y mercantil']::text[], ARRAY['SE']::text[], ARRAY['aislamiento']::text[], '{}'::text[],
   $$Datos de demostración. Cliente del segundo despacho, solo para pruebas de aislamiento.$$, 'text-embedding-3-small', true)
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, is_demo = true;

INSERT INTO ciceron.case_files (id, firm_id, matter_id, is_sample, court_name, file_number, connector_kind, metadata) VALUES
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, true,
   'TFJA Sala Regional Metropolitana', 'DEMO-TFJA-1001/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000002'::uuid, true,
   'Juzgado Decimo de Distrito en Materia Administrativa', 'DEMO-JDA-220/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000003'::uuid, true,
   'TFJA Sala Especializada', 'DEMO-TFJA-331/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000004'::uuid, true,
   'Juzgado Primero de Distrito en Materia de Amparo', 'DEMO-AMP-404/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000005'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000005'::uuid, true,
   'TFJA Sala Regional del Pacífico', 'DEMO-TFJA-515/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000006'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000006'::uuid, true,
   'Juzgado Civil de Cuantía Mayor CDMX', 'DEMO-CIV-616/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000007'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000007'::uuid, true,
   'Juzgado Laboral Federal', 'DEMO-LAB-717/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000008'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, true,
   'SCJN (asunto ficticio de seguimiento)', 'DEMO-SCJN-A-808/2026', 'sample', '{"label":"Datos de demostración"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET is_sample = true, file_number = EXCLUDED.file_number;

INSERT INTO ciceron.case_events (case_file_id, event_type, occurred_at, summary, raw_payload)
SELECT * FROM (VALUES
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{"source":"sample","label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000001'::uuid, 'notificacion', timestamptz '2026-10-22 16:30:00+00',
   'Datos de demostración. Notificación por lista: término de quince días hábiles para contestar.',
   '{"source":"sample","label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000002'::uuid, 'acuerdo', timestamptz '2026-10-15 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
   '{"source":"sample","label":"Datos de demostración"}'::jsonb),
  ('f1000000-0000-4000-8000-000000000004'::uuid, 'acuerdo', timestamptz '2026-10-18 12:00:00+00',
   'Datos de demostración. Se tiene por presentado el escrito de demanda.',
   '{"source":"sample","label":"Datos de demostración"}'::jsonb)
) AS v(case_file_id, event_type, occurred_at, summary, raw_payload)
WHERE NOT EXISTS (
  SELECT 1 FROM ciceron.case_events e
  WHERE e.case_file_id = v.case_file_id AND e.event_type = v.event_type AND e.occurred_at = v.occurred_at
);

INSERT INTO ciceron.deadlines (case_file_id, matter_id, status, due_at, basis_text)
SELECT c.id, c.matter_id, 'propuesto', timestamptz '2026-11-14 23:59:00-06',
  'Datos de demostración. Ejemplo: quince días hábiles para contestar demanda (regla de demostración).'
FROM ciceron.case_files c
WHERE c.id IN (
  'f1000000-0000-4000-8000-000000000001'::uuid,
  'f1000000-0000-4000-8000-000000000002'::uuid
)
AND NOT EXISTS (
  SELECT 1 FROM ciceron.deadlines d WHERE d.case_file_id = c.id AND d.status = 'propuesto'
);

INSERT INTO ciceron.non_working_days (calendar_date, jurisdiction, description) VALUES
  (DATE '2026-01-01', 'MX', 'Año Nuevo'),
  (DATE '2026-02-02', 'MX', 'Día de la Constitución (primer lunes de febrero)'),
  (DATE '2026-03-16', 'MX', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  (DATE '2026-05-01', 'MX', 'Día del Trabajo'),
  (DATE '2026-09-16', 'MX', 'Día de la Independencia'),
  (DATE '2026-11-16', 'MX', 'Revolución Mexicana (tercer lunes de noviembre)'),
  (DATE '2026-12-25', 'MX', 'Navidad'),
  (DATE '2027-01-01', 'MX', 'Año Nuevo'),
  (DATE '2027-02-01', 'MX', 'Día de la Constitución (primer lunes de febrero)'),
  (DATE '2027-03-15', 'MX', 'Natalicio de Benito Juárez (tercer lunes de marzo)'),
  (DATE '2027-05-01', 'MX', 'Día del Trabajo'),
  (DATE '2027-09-16', 'MX', 'Día de la Independencia'),
  (DATE '2027-11-15', 'MX', 'Revolución Mexicana (tercer lunes de noviembre)'),
  (DATE '2027-12-25', 'MX', 'Navidad')
ON CONFLICT (jurisdiction, calendar_date) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO ciceron.events (name, firm_id, user_id, properties, occurred_at)
SELECT 'seed_completed', 'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000004'::uuid,
  '{"label":"Datos de demostración","version":2,"seed":"302_prod_safe"}'::jsonb, now()
WHERE NOT EXISTS (
  SELECT 1 FROM ciceron.events e
  WHERE e.name = 'seed_completed' AND e.firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
);

COMMENT ON SCHEMA ciceron IS
  'Cicéron legal intelligence — isolated from public civic tables. Demo actors in demo_personas, not auth.users.';
