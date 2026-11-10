-- 306_ciceron_classify_match.sql
-- Prompt 4: classification / matching columns, enriched demo watch profiles,
-- prompt_versions seed. Additive. Depends on 305.

-- Drop auth FK on review_tasks.assignee so demo personas can be assigned
ALTER TABLE ciceron.review_tasks DROP CONSTRAINT IF EXISTS review_tasks_assignee_id_fkey;
COMMENT ON COLUMN ciceron.review_tasks.assignee_id IS
  'Actor id: auth.users or ciceron.demo_personas.id (Datos de demostración).';

-- Note-level classification payload
ALTER TABLE ciceron.classifications
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS authority text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS entry_into_force date,
  ADD COLUMN IF NOT EXISTS compliance_deadlines text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES ciceron.prompt_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_run_id uuid REFERENCES ciceron.ai_runs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS classifications_dof_note_uidx
  ON ciceron.classifications (dof_note_id)
  WHERE dof_note_id IS NOT NULL AND chunk_id IS NULL;

ALTER TABLE ciceron.matches
  ADD COLUMN IF NOT EXISTS supporting_chunk_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS candidate_score numeric(6, 4),
  ADD COLUMN IF NOT EXISTS vector_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback text
    CHECK (feedback IS NULL OR feedback IN ('relevante', 'no_relevante')),
  ADD COLUMN IF NOT EXISTS feedback_reason text,
  ADD COLUMN IF NOT EXISTS feedback_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_run_id uuid REFERENCES ciceron.ai_runs(id) ON DELETE SET NULL;

ALTER TABLE ciceron.dof_notes
  ADD COLUMN IF NOT EXISTS classify_status text NOT NULL DEFAULT 'pending'
    CHECK (classify_status IN ('pending', 'classified', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS match_status text NOT NULL DEFAULT 'pending'
    CHECK (match_status IN ('pending', 'matched', 'no_match', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS dof_notes_classify_status_idx
  ON ciceron.dof_notes (classify_status, note_date DESC);
CREATE INDEX IF NOT EXISTS dof_notes_match_status_idx
  ON ciceron.dof_notes (match_status, note_date DESC);

-- Saved monitor views (per demo actor / user)
CREATE TABLE IF NOT EXISTS ciceron.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  room text NOT NULL DEFAULT 'monitor-dof',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, user_id, name)
);

ALTER TABLE ciceron.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.saved_views FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.saved_views FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ciceron.saved_views TO authenticated;
GRANT ALL ON ciceron.saved_views TO service_role;

DROP POLICY IF EXISTS saved_views_select ON ciceron.saved_views;
CREATE POLICY saved_views_select ON ciceron.saved_views
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  );

DROP POLICY IF EXISTS saved_views_write ON ciceron.saved_views;
CREATE POLICY saved_views_write ON ciceron.saved_views
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  );

DROP TRIGGER IF EXISTS saved_views_set_updated_at ON ciceron.saved_views;
CREATE TRIGGER saved_views_set_updated_at
  BEFORE UPDATE ON ciceron.saved_views
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- Prompt versions
INSERT INTO ciceron.prompt_versions (purpose, version_label, template, model_hint)
VALUES
  (
    'dof_classify',
    'v1',
    'Classify DOF note into taxonomy; untrusted text in delimited block; JSON only.',
    'claude-haiku-4-5-20251001'
  ),
  (
    'dof_match_relevance',
    'v1',
    'Judge relevance of DOF note to a client watch profile; JSON only.',
    'claude-haiku-4-5-20251001'
  ),
  (
    'dof_client_alert_draft',
    'v1',
    'Draft short client alert from match; JSON only; never send.',
    'claude-sonnet-5'
  )
ON CONFLICT (purpose, version_label) DO UPDATE
  SET template = EXCLUDED.template, model_hint = EXCLUDED.model_hint;

-- Enrich Datos de demostración watch profiles for convincing matches vs real DOF
UPDATE ciceron.watch_profiles SET
  subject_areas = ARRAY['financiero y fintech','datos personales','administrativo']::text[],
  authorities = ARRAY['CNBV','Banxico','UIF','SHCP','Secretaría de Hacienda']::text[],
  keywords = ARRAY['PLD','fintech','SPEI','fondos de pago','prevención de lavado','instituciones de crédito','disposiciones de carácter general']::text[],
  norms_of_interest = ARRAY['LFPIORPI','Ley Fintech','CIRCUITO de pagos']::text[],
  description = $$Datos de demostración. Emisora de pagos electrónicos. Vigila regulación CNBV/Banxico sobre fondos de pago, PLD, identificación de clientes y conservación de registros.$$,
  updated_at = now()
WHERE id = 'e1000000-0000-4000-8000-000000000001'::uuid;

UPDATE ciceron.watch_profiles SET
  subject_areas = ARRAY['salud y regulación sanitaria','administrativo']::text[],
  authorities = ARRAY['COFEPRIS','SSA','Consejo de Salubridad General']::text[],
  keywords = ARRAY['cadena de frío','farmacovigilancia','insumos para la salud','registros sanitarios','compendio nacional']::text[],
  norms_of_interest = ARRAY['LISSA','Reglamento de Insumos']::text[],
  description = $$Datos de demostración. Distribuidora farmacéutica. Vigila COFEPRIS, Compendio Nacional de Insumos para la Salud, cadena de frío y publicidad sanitaria.$$,
  updated_at = now()
WHERE id = 'e1000000-0000-4000-8000-000000000002'::uuid;

UPDATE ciceron.watch_profiles SET
  subject_areas = ARRAY['energía','ambiental','administrativo']::text[],
  authorities = ARRAY['CRE','SENER','SEMARNAT','CFE']::text[],
  keywords = ARRAY['generación','eólica','interconexión','impacto ambiental','permiso de generación']::text[],
  norms_of_interest = ARRAY['LGEEPA','Ley de la Industria Eléctrica']::text[],
  description = $$Datos de demostración. Generación eólica en el Istmo. Vigila permisos CRE, evaluación de impacto ambiental y reglas de interconexión.$$,
  updated_at = now()
WHERE id = 'e1000000-0000-4000-8000-000000000003'::uuid;

UPDATE ciceron.watch_profiles SET
  subject_areas = ARRAY['comercio exterior y aduanas','fiscal']::text[],
  authorities = ARRAY['SAT','ANAM','Secretaría de Economía']::text[],
  keywords = ARRAY['fracción arancelaria','pedimento','reglas generales de comercio exterior','NOM de producto','clasificación arancelaria']::text[],
  norms_of_interest = ARRAY['Ley Aduanera','RGCE']::text[],
  description = $$Datos de demostración. Agencia aduanal. Vigila RGCE, clasificación arancelaria, NOM de producto y auditorías SAT.$$,
  updated_at = now()
WHERE id = 'e1000000-0000-4000-8000-000000000004'::uuid;

UPDATE ciceron.watch_profiles SET
  subject_areas = ARRAY['inmobiliario','financiero y fintech','fiscal']::text[],
  authorities = ARRAY['CNBV','SEDUVI','SHCP']::text[],
  keywords = ARRAY['arrendamiento','fideicomiso','inmuebles','renta','portafolio']::text[],
  norms_of_interest = ARRAY['Código Civil','Ley del ISR']::text[],
  description = $$Datos de demostración. Fondo inmobiliario de renta. Vigila arrendamiento, fideicomisos y supervisión financiera aplicable.$$,
  updated_at = now()
WHERE id = 'e1000000-0000-4000-8000-000000000005'::uuid;

UPDATE ciceron.watch_profiles SET
  subject_areas = ARRAY['salud y regulación sanitaria','laboral','administrativo']::text[],
  authorities = ARRAY['COFEPRIS','STPS','PROFECO']::text[],
  keywords = ARRAY['etiquetado','NOM-051','inocuidad','alimentos','publicidad']::text[],
  norms_of_interest = ARRAY['LFNS','NOM-051-SCFI']::text[],
  description = $$Datos de demostración. Alimentos procesados. Vigila etiquetado frontal, inocuidad alimentaria y obligaciones laborales.$$,
  updated_at = now()
WHERE id = 'e1000000-0000-4000-8000-000000000006'::uuid;

COMMENT ON TABLE ciceron.saved_views IS 'Per-user saved filter views for Monitor DOF (Datos de demostración ok).';
